import Observation
import PencilKit
import SwiftUI

enum ScratchpadTab: String, CaseIterable, Identifiable, Sendable {
    case draw
    case notes

    var id: String { rawValue }

    var title: String {
        switch self {
        case .draw: "Draw"
        case .notes: "Notes"
        }
    }
}

enum ScratchpadDrawingTool: String, Sendable {
    case pen
    case eraser
}

enum ScratchpadInkColor: String, CaseIterable, Identifiable, Sendable {
    case ink
    case indigo
    case coral
    case mint

    var id: String { rawValue }

    var title: String {
        switch self {
        case .ink: "Ink"
        case .indigo: "Indigo"
        case .coral: "Coral"
        case .mint: "Mint"
        }
    }

    var color: Color {
        Color(uiColor: uiColor)
    }

    var uiColor: UIColor {
        switch self {
        case .ink: UIColor(red: 0.055, green: 0.157, blue: 0.255, alpha: 1)
        case .indigo: UIColor(red: 0.353, green: 0.275, blue: 0.976, alpha: 1)
        case .coral: UIColor(red: 0.827, green: 0.235, blue: 0.208, alpha: 1)
        case .mint: UIColor(red: 0.039, green: 0.514, blue: 0.373, alpha: 1)
        }
    }
}

struct ScratchpadView: View {
    @Bindable var practiceModel: PracticeViewModel
    let onDone: () -> Void

    @State private var selectedTab: ScratchpadTab = .draw
    @State private var selectedTool: ScratchpadDrawingTool = .pen
    @State private var selectedColor: ScratchpadInkColor = .ink
    @State private var canvasController = ScratchpadCanvasController()
    @State private var showsClearConfirmation = false
    @FocusState private var notesAreFocused: Bool

    var body: some View {
        VStack(spacing: SaturnPathSpacing.medium) {
            header
            tabPicker

            switch selectedTab {
            case .draw:
                drawingContent
            case .notes:
                notesContent
            }

            privacyNote
        }
        .padding(.horizontal, SaturnPathSpacing.large)
        .padding(.bottom, SaturnPathSpacing.medium)
        .background(SaturnPathTheme.canvas.opacity(0.72))
        .confirmationDialog(
            "Clear this scratchpad?",
            isPresented: $showsClearConfirmation,
            titleVisibility: .visible
        ) {
            Button("Clear Drawing", role: .destructive) {
                canvasController.clear()
            }
            Button("Cancel", role: .cancel) {}
        } message: {
            Text("This removes the drawing for the current question. It cannot be undone.")
        }
        .onChange(of: selectedTab) { _, tab in
            notesAreFocused = tab == .notes
        }
    }

    private var header: some View {
        HStack(spacing: SaturnPathSpacing.medium) {
            VStack(alignment: .leading, spacing: 2) {
                Text("Scratchpad")
                    .font(SaturnPathTypography.sectionTitle)
                    .foregroundStyle(SaturnPathTheme.ink)
                    .accessibilityAddTraits(.isHeader)
                    .accessibilityIdentifier("saturnpath.scratchpad.sheet")

                Text("Saved only for this question")
                    .font(SaturnPathTypography.caption)
                    .foregroundStyle(SaturnPathTheme.mutedInk)
            }

            Spacer()

            Button("Done", action: onDone)
                .font(SaturnPathTypography.bodyStrong)
                .foregroundStyle(SaturnPathTheme.primaryDeep)
                .frame(minWidth: 60, minHeight: 44)
                .accessibilityIdentifier("saturnpath.scratchpad.done")
        }
    }

    private var tabPicker: some View {
        Picker("Scratchpad mode", selection: $selectedTab) {
            ForEach(ScratchpadTab.allCases) { tab in
                Text(tab.title).tag(tab)
            }
        }
        .pickerStyle(.segmented)
        .accessibilityIdentifier("saturnpath.scratchpad.tabs")
    }

    private var drawingContent: some View {
        VStack(spacing: SaturnPathSpacing.small) {
            drawingToolbar

            ScratchpadCanvas(
                drawingData: practiceModel.scratchDrawingData,
                tool: selectedTool,
                inkColor: selectedColor,
                controller: canvasController,
                onDrawingChanged: practiceModel.updateScratchDrawing
            )
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .background(Color.white.opacity(0.92), in: RoundedRectangle(cornerRadius: SaturnPathRadius.control, style: .continuous))
            .overlay {
                RoundedRectangle(cornerRadius: SaturnPathRadius.control, style: .continuous)
                    .stroke(SaturnPathTheme.lineStrong, lineWidth: 1)
            }
            .clipShape(RoundedRectangle(cornerRadius: SaturnPathRadius.control, style: .continuous))
            .accessibilityLabel("Drawing scratchpad")
            .accessibilityHint("Draw with Apple Pencil or one finger")
            .accessibilityIdentifier("saturnpath.scratchpad.canvas")
        }
    }

    private var drawingToolbar: some View {
        VStack(spacing: SaturnPathSpacing.xSmall) {
            HStack(spacing: SaturnPathSpacing.xSmall) {
                toolButton(
                    title: "Pen",
                    systemImage: "pencil.tip",
                    tool: .pen
                )
                toolButton(
                    title: "Eraser",
                    systemImage: "eraser",
                    tool: .eraser
                )

                Spacer(minLength: 0)

                commandButton(
                    title: "Undo",
                    systemImage: "arrow.uturn.backward",
                    isEnabled: canvasController.canUndo,
                    action: canvasController.undo
                )
                commandButton(
                    title: "Redo",
                    systemImage: "arrow.uturn.forward",
                    isEnabled: canvasController.canRedo,
                    action: canvasController.redo
                )
                commandButton(
                    title: "Clear",
                    systemImage: "trash",
                    isEnabled: canvasController.hasDrawing
                ) {
                    showsClearConfirmation = true
                }
            }

            HStack(spacing: SaturnPathSpacing.xSmall) {
                Text("Ink")
                    .font(SaturnPathTypography.caption)
                    .foregroundStyle(SaturnPathTheme.mutedInk)

                ForEach(ScratchpadInkColor.allCases) { color in
                    colorButton(color)
                }

                Spacer(minLength: 0)
            }
        }
        .accessibilityIdentifier("saturnpath.scratchpad.toolbar")
    }

    private func toolButton(
        title: String,
        systemImage: String,
        tool: ScratchpadDrawingTool
    ) -> some View {
        let isSelected = selectedTool == tool
        return Button {
            selectedTool = tool
        } label: {
            Label(title, systemImage: systemImage)
                .font(SaturnPathTypography.caption)
                .padding(.horizontal, SaturnPathSpacing.small)
                .frame(minHeight: 44)
                .foregroundStyle(isSelected ? SaturnPathTheme.primaryDeep : SaturnPathTheme.mutedInk)
                .background(
                    isSelected ? SaturnPathTheme.primarySoft : SaturnPathTheme.surfaceStrong,
                    in: RoundedRectangle(cornerRadius: 13, style: .continuous)
                )
                .overlay {
                    RoundedRectangle(cornerRadius: 13, style: .continuous)
                        .stroke(isSelected ? SaturnPathTheme.primary.opacity(0.45) : SaturnPathTheme.lineStrong, lineWidth: 1)
                }
        }
        .buttonStyle(.plain)
        .accessibilityAddTraits(isSelected ? .isSelected : [])
        .accessibilityIdentifier("saturnpath.scratchpad.tool.\(tool.rawValue)")
    }

    private func colorButton(_ inkColor: ScratchpadInkColor) -> some View {
        let isSelected = selectedColor == inkColor
        return Button {
            selectedColor = inkColor
            selectedTool = .pen
        } label: {
            ZStack {
                Color.clear
                    .frame(width: 44, height: 44)
                Circle()
                    .fill(inkColor.color)
                    .frame(width: 28, height: 28)
                if isSelected {
                    Image(systemName: "checkmark")
                        .font(.system(.caption2, weight: .bold))
                        .foregroundStyle(.white)
                }
            }
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .accessibilityLabel("\(inkColor.title) ink")
        .accessibilityAddTraits(isSelected ? .isSelected : [])
        .accessibilityIdentifier("saturnpath.scratchpad.color.\(inkColor.rawValue)")
    }

    private func commandButton(
        title: String,
        systemImage: String,
        isEnabled: Bool,
        action: @escaping () -> Void
    ) -> some View {
        Button(action: action) {
            Image(systemName: systemImage)
                .frame(width: 44, height: 44)
        }
        .buttonStyle(.plain)
        .foregroundStyle(isEnabled ? SaturnPathTheme.primaryDeep : SaturnPathTheme.softInk)
        .background(SaturnPathTheme.surfaceStrong, in: RoundedRectangle(cornerRadius: 13, style: .continuous))
        .disabled(!isEnabled)
        .accessibilityLabel(title)
        .accessibilityIdentifier("saturnpath.scratchpad.command.\(title.lowercased())")
    }

    private var notesContent: some View {
        VStack(alignment: .leading, spacing: SaturnPathSpacing.xSmall) {
            Text("Typed notes")
                .font(SaturnPathTypography.caption)
                .foregroundStyle(SaturnPathTheme.ink)

            TextEditor(
                text: Binding(
                    get: { practiceModel.scratchNotes },
                    set: { practiceModel.updateScratchNotes($0) }
                )
            )
            .focused($notesAreFocused)
            .font(.system(.body, design: .monospaced))
            .scrollContentBackground(.hidden)
            .padding(SaturnPathSpacing.small)
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .background(Color.white.opacity(0.92), in: RoundedRectangle(cornerRadius: SaturnPathRadius.control, style: .continuous))
            .overlay {
                RoundedRectangle(cornerRadius: SaturnPathRadius.control, style: .continuous)
                    .stroke(SaturnPathTheme.lineStrong, lineWidth: 1)
            }
            .accessibilityHint("Use plain text for calculations or reminders")
            .accessibilityIdentifier("saturnpath.scratchpad.notes")

            HStack {
                Text("Use plain-text symbols such as x, /, ^, and parentheses.")
                Spacer()
                Text("\(practiceModel.scratchNotes.count)/2000")
            }
            .font(.system(.caption2, design: .rounded))
            .foregroundStyle(SaturnPathTheme.softInk)
        }
    }

    private var privacyNote: some View {
        Label("Drawing and notes stay on this device for the active attempt.", systemImage: "lock")
            .font(.system(.caption2, design: .rounded, weight: .medium))
            .foregroundStyle(SaturnPathTheme.mutedInk)
            .frame(maxWidth: .infinity, alignment: .leading)
            .accessibilityIdentifier("saturnpath.scratchpad.privacy")
    }
}

@MainActor
@Observable
final class ScratchpadCanvasController {
    private weak var canvasView: PKCanvasView?
    @ObservationIgnored private var onDrawingChanged: ((Data?) -> Void)?
    private(set) var canUndo = false
    private(set) var canRedo = false
    private(set) var hasDrawing = false

    func attach(
        _ canvasView: PKCanvasView,
        onDrawingChanged: @escaping (Data?) -> Void
    ) {
        self.canvasView = canvasView
        self.onDrawingChanged = onDrawingChanged
        refresh()
    }

    func updateDrawingHandler(_ onDrawingChanged: @escaping (Data?) -> Void) {
        self.onDrawingChanged = onDrawingChanged
    }

    func refresh() {
        canUndo = canvasView?.undoManager?.canUndo == true
        canRedo = canvasView?.undoManager?.canRedo == true
        hasDrawing = canvasView?.drawing.strokes.isEmpty == false
    }

    func undo() {
        canvasView?.undoManager?.undo()
        publishDrawing()
        refresh()
    }

    func redo() {
        canvasView?.undoManager?.redo()
        publishDrawing()
        refresh()
    }

    func clear() {
        canvasView?.drawing = PKDrawing()
        publishDrawing()
        refresh()
    }

    private func publishDrawing() {
        guard let canvasView else { return }
        let data = canvasView.drawing.strokes.isEmpty ? nil : canvasView.drawing.dataRepresentation()
        onDrawingChanged?(data)
    }
}

private struct ScratchpadCanvas: UIViewRepresentable {
    let drawingData: Data?
    let tool: ScratchpadDrawingTool
    let inkColor: ScratchpadInkColor
    let controller: ScratchpadCanvasController
    let onDrawingChanged: (Data?) -> Void

    func makeCoordinator() -> Coordinator {
        Coordinator(controller: controller, onDrawingChanged: onDrawingChanged)
    }

    func makeUIView(context: Context) -> PKCanvasView {
        let canvasView = PKCanvasView()
        canvasView.delegate = context.coordinator
        canvasView.drawingPolicy = .anyInput
        canvasView.backgroundColor = .clear
        canvasView.isOpaque = false
        if let drawingData, let drawing = try? PKDrawing(data: drawingData) {
            canvasView.drawing = drawing
        }
        applyTool(to: canvasView)
        controller.attach(canvasView, onDrawingChanged: onDrawingChanged)
        return canvasView
    }

    func updateUIView(_ canvasView: PKCanvasView, context: Context) {
        context.coordinator.onDrawingChanged = onDrawingChanged
        controller.updateDrawingHandler(onDrawingChanged)
        applyTool(to: canvasView)

        let currentData = canvasView.drawing.strokes.isEmpty ? nil : canvasView.drawing.dataRepresentation()
        if currentData != drawingData {
            canvasView.drawing = drawingData.flatMap { try? PKDrawing(data: $0) } ?? PKDrawing()
        }
        controller.refresh()
    }

    private func applyTool(to canvasView: PKCanvasView) {
        switch tool {
        case .pen:
            canvasView.tool = PKInkingTool(.pen, color: inkColor.uiColor, width: 4)
        case .eraser:
            canvasView.tool = PKEraserTool(.vector)
        }
    }

    final class Coordinator: NSObject, PKCanvasViewDelegate {
        let controller: ScratchpadCanvasController
        var onDrawingChanged: (Data?) -> Void

        init(
            controller: ScratchpadCanvasController,
            onDrawingChanged: @escaping (Data?) -> Void
        ) {
            self.controller = controller
            self.onDrawingChanged = onDrawingChanged
        }

        func canvasViewDrawingDidChange(_ canvasView: PKCanvasView) {
            let data = canvasView.drawing.strokes.isEmpty ? nil : canvasView.drawing.dataRepresentation()
            onDrawingChanged(data)
            controller.refresh()
        }
    }
}

#Preview("Scratchpad") {
    ScratchpadView(practiceModel: PracticeViewModel(), onDone: {})
        .frame(height: 520)
}
