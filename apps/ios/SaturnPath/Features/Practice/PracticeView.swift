import SwiftUI

struct PracticeView: View {
    let onClose: () -> Void

    @Environment(\.appDependencies) private var dependencies
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @Environment(\.scenePhase) private var scenePhase
    @State private var model = PracticeViewModel()
    @State private var showsCloseConfirmation = false

    var body: some View {
        NavigationStack {
            ZStack {
                SaturnPathBackground()
                content
            }
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button {
                        if model.phase == .question || model.phase == .feedback {
                            showsCloseConfirmation = true
                        } else {
                            closeAndDiscard()
                        }
                    } label: {
                        Image(systemName: "xmark")
                            .font(.system(.body, weight: .bold))
                            .frame(width: 44, height: 44)
                    }
                    .accessibilityLabel("Close practice")
                    .accessibilityIdentifier("saturnpath.practice.close")
                }

                ToolbarItem(placement: .principal) {
                    if let step = model.questionStep, model.phase == .question || model.phase == .feedback {
                        Text("Question \(step.position) of \(step.totalCount)")
                            .font(SaturnPathTypography.caption)
                            .foregroundStyle(SaturnPathTheme.mutedInk)
                    } else if model.phase == .recommendedStop {
                        Text("Daily goal")
                            .font(SaturnPathTypography.caption)
                            .foregroundStyle(SaturnPathTheme.mutedInk)
                    } else {
                        Text("Practice")
                            .font(SaturnPathTypography.caption)
                            .foregroundStyle(SaturnPathTheme.mutedInk)
                    }
                }
            }
            .toolbarBackground(.ultraThinMaterial, for: .navigationBar)
            .toolbarBackground(.visible, for: .navigationBar)
        }
        .task {
            guard model.phase == .idle else {
                return
            }
            await model.start(
                using: dependencies.practiceRepository,
                recoveryStore: dependencies.recoveryStore
            )
        }
        .onChange(of: model.selectedResponse) { _, _ in
            Task {
                await model.persist(using: dependencies.recoveryStore)
            }
        }
        .onChange(of: scenePhase) { _, nextPhase in
            switch nextPhase {
            case .active:
                model.resume()
            case .inactive, .background:
                Task {
                    await model.suspend(using: dependencies.recoveryStore)
                }
            @unknown default:
                break
            }
        }
        .confirmationDialog(
            "Leave this practice session?",
            isPresented: $showsCloseConfirmation,
            titleVisibility: .visible
        ) {
            Button("Leave Practice", role: .destructive, action: closeAndDiscard)
            Button("Keep Practicing", role: .cancel) {}
        } message: {
            Text("Your saved response for this question will be cleared.")
        }
        .animation(SaturnPathMotion.standard(reduceMotion: reduceMotion), value: model.phase)
    }

    private func closeAndDiscard() {
        Task {
            await model.discardRecovery(using: dependencies.recoveryStore)
            onClose()
        }
    }

    @ViewBuilder
    private var content: some View {
        switch model.phase {
        case .idle, .loading:
            PracticeLoadingView()
        case .question:
            if let step = model.questionStep {
                PracticeQuestionView(model: model, step: step)
            }
        case .feedback:
            if let feedback = model.feedback {
                PracticeFeedbackView(model: model, feedback: feedback) {
                    Task {
                        await model.advance(
                            using: dependencies.practiceRepository,
                            recoveryStore: dependencies.recoveryStore
                        )
                    }
                }
            }
        case .recommendedStop:
            PracticeStopRecommendationView(
                isWorking: model.isResolvingStop,
                onFinish: {
                    Task {
                        await model.finishRecommendedStop(
                            using: dependencies.practiceRepository,
                            recoveryStore: dependencies.recoveryStore
                        )
                    }
                },
                onKeepPracticing: {
                    Task {
                        await model.keepPracticing(
                            using: dependencies.practiceRepository,
                            recoveryStore: dependencies.recoveryStore
                        )
                    }
                }
            )
        case .summary:
            if let summary = model.summary {
                PracticeSummaryView(summary: summary, onFinish: closeAndDiscard)
            }
        case let .failure(failure):
            PracticeFailureView(failure: failure) {
                Task {
                    await model.start(
                        using: dependencies.practiceRepository,
                        recoveryStore: dependencies.recoveryStore
                    )
                }
            }
        }
    }
}

private struct PracticeQuestionView: View {
    @Bindable var model: PracticeViewModel
    let step: PracticeQuestionStep

    @Environment(\.appDependencies) private var dependencies
    @State private var showsScratchpad = false
    @State private var questionBottom: CGFloat = 0

    var body: some View {
        GeometryReader { geometry in
            VStack(spacing: 0) {
                ScrollView {
                    VStack(alignment: .leading, spacing: SaturnPathSpacing.large) {
                        questionCard
                        scratchpadButton
                        responseControls
                        whyCard
                    }
                    .frame(maxWidth: 620)
                    .padding(.horizontal, SaturnPathSpacing.large)
                    .padding(.vertical, SaturnPathSpacing.large)
                    .frame(maxWidth: .infinity)
                }
                .scrollIndicators(.hidden)

                Button {
                    Task {
                        await model.submit(
                            using: dependencies.practiceRepository,
                            recoveryStore: dependencies.recoveryStore
                        )
                    }
                } label: {
                    if model.isSubmitting {
                        ProgressView()
                            .tint(.white)
                            .accessibilityLabel("Submitting answer")
                    } else {
                        Text("Submit Answer")
                    }
                }
                .buttonStyle(SaturnPathPrimaryButtonStyle())
                .disabled(!model.canSubmit)
                .opacity(model.canSubmit ? 1 : 0.55)
                .padding(.horizontal, SaturnPathSpacing.large)
                .padding(.vertical, SaturnPathSpacing.medium)
                .background(.ultraThinMaterial)
                .accessibilityIdentifier("saturnpath.practice.submit")
            }
            .coordinateSpace(name: "practice-question")
            .onPreferenceChange(PracticeQuestionBottomPreferenceKey.self) { bottom in
                questionBottom = bottom
            }
            .sheet(isPresented: $showsScratchpad) {
                ScratchpadView(practiceModel: model) {
                    Task {
                        await model.persist(using: dependencies.recoveryStore)
                        showsScratchpad = false
                    }
                }
                .presentationDetents([
                    .height(scratchpadHeight(containerHeight: geometry.size.height))
                ])
                .presentationDragIndicator(.visible)
                .presentationCornerRadius(SaturnPathRadius.hero)
                .presentationBackground(.ultraThinMaterial)
                .presentationContentInteraction(.scrolls)
            }
            .onChange(of: showsScratchpad) { wasShowing, isShowing in
                guard wasShowing, !isShowing else {
                    return
                }
                Task {
                    await model.persist(using: dependencies.recoveryStore)
                }
            }
        }
    }

    private var questionCard: some View {
        VStack(alignment: .leading, spacing: SaturnPathSpacing.large) {
            questionHeader
            Text(step.question.prompt)
                .font(.system(.title3, design: .rounded, weight: .semibold))
                .foregroundStyle(SaturnPathTheme.ink)
                .lineSpacing(5)
                .accessibilityAddTraits(.isHeader)
                .accessibilityIdentifier("saturnpath.practice.prompt")
        }
        .background {
            GeometryReader { geometry in
                Color.clear.preference(
                    key: PracticeQuestionBottomPreferenceKey.self,
                    value: geometry.frame(in: .named("practice-question")).maxY
                )
            }
        }
    }

    private var scratchpadButton: some View {
        Button {
            showsScratchpad = true
        } label: {
            HStack(spacing: SaturnPathSpacing.small) {
                Image(systemName: "pencil.and.scribble")
                    .accessibilityHidden(true)
                Text(
                    model.scratchDrawingData == nil
                        && model.scratchNotes.isEmpty
                        && model.calculatorState.isEmpty
                        ? "Open Scratchpad"
                        : "Resume Scratchpad"
                )
                Spacer()
                Image(systemName: "chevron.up")
                    .font(.system(.caption, weight: .bold))
                    .accessibilityHidden(true)
            }
            .font(SaturnPathTypography.bodyStrong)
            .foregroundStyle(SaturnPathTheme.primaryDeep)
            .padding(.horizontal, SaturnPathSpacing.medium)
            .frame(maxWidth: .infinity, minHeight: 52)
            .background(SaturnPathTheme.primarySoft, in: RoundedRectangle(cornerRadius: SaturnPathRadius.control, style: .continuous))
            .overlay {
                RoundedRectangle(cornerRadius: SaturnPathRadius.control, style: .continuous)
                    .stroke(SaturnPathTheme.primary.opacity(0.32), lineWidth: 1)
            }
        }
        .buttonStyle(.plain)
        .accessibilityHint("Opens below the complete question and may cover answer choices")
        .accessibilityIdentifier("saturnpath.practice.scratchpad")
    }

    private func scratchpadHeight(containerHeight: CGFloat) -> CGFloat {
        let safeQuestionBottom = max(0, questionBottom)
        return max(140, min(520, containerHeight - safeQuestionBottom - SaturnPathSpacing.small))
    }

    private var questionHeader: some View {
        HStack(alignment: .center, spacing: SaturnPathSpacing.small) {
            VStack(alignment: .leading, spacing: 2) {
                Text(step.question.sectionLabel)
                    .font(SaturnPathTypography.eyebrow)
                    .tracking(1)
                    .textCase(.uppercase)
                    .foregroundStyle(SaturnPathTheme.primaryDeep)
                Text(step.question.skillLabel)
                    .font(SaturnPathTypography.caption)
                    .foregroundStyle(SaturnPathTheme.mutedInk)
            }

            Spacer()

            PracticeTimerView(
                accumulatedSeconds: model.accumulatedElapsedSeconds,
                resumedAt: model.questionPresentedAt,
                expectedSeconds: step.question.expectedSeconds
            )
        }
    }

    @ViewBuilder
    private var responseControls: some View {
        switch step.question.responseKind {
        case .multipleChoice:
            VStack(spacing: SaturnPathSpacing.small) {
                ForEach(step.question.choices) { choice in
                    PracticeChoiceButton(
                        choice: choice,
                        isSelected: model.selectedResponse == choice.id
                    ) {
                        model.selectResponse(choice.id)
                    }
                }
            }
        case .studentProduced:
            VStack(alignment: .leading, spacing: SaturnPathSpacing.xSmall) {
                Text("Your answer")
                    .font(SaturnPathTypography.caption)
                    .foregroundStyle(SaturnPathTheme.ink)

                TextField(
                    "Enter a number",
                    text: Binding(
                        get: { model.selectedResponse ?? "" },
                        set: { newValue in
                            model.selectResponse(newValue)
                        }
                    )
                )
                .font(SaturnPathTypography.metric)
                .keyboardType(.numbersAndPunctuation)
                .padding(.horizontal, SaturnPathSpacing.medium)
                .frame(minHeight: 58)
                .background(SaturnPathTheme.surfaceStrong, in: RoundedRectangle(cornerRadius: SaturnPathRadius.control, style: .continuous))
                .overlay {
                    RoundedRectangle(cornerRadius: SaturnPathRadius.control, style: .continuous)
                        .stroke(SaturnPathTheme.lineStrong, lineWidth: 1)
                }
                .accessibilityIdentifier("saturnpath.practice.student-response")
            }
        }
    }

    private var whyCard: some View {
        VStack(alignment: .leading, spacing: SaturnPathSpacing.medium) {
            Label(step.question.whyTitle, systemImage: "sparkles")
                .font(SaturnPathTypography.bodyStrong)
                .foregroundStyle(SaturnPathTheme.ink)

            ViewThatFits(in: .horizontal) {
                HStack(spacing: SaturnPathSpacing.small) {
                    metricViews
                }
                VStack(spacing: SaturnPathSpacing.small) {
                    metricViews
                }
            }
        }
        .spGlassCard(padding: SaturnPathSpacing.medium, radius: SaturnPathRadius.card)
        .accessibilityIdentifier("saturnpath.practice.why")
    }

    @ViewBuilder
    private var metricViews: some View {
        ForEach(step.question.whyMetrics) { metric in
            VStack(alignment: .leading, spacing: 2) {
                Text(metric.label)
                    .font(SaturnPathTypography.caption)
                    .foregroundStyle(SaturnPathTheme.mutedInk)
                Text(metric.value)
                    .font(SaturnPathTypography.bodyStrong)
                    .foregroundStyle(SaturnPathTheme.primaryDeep)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(SaturnPathSpacing.small)
            .background(SaturnPathTheme.primarySoft, in: RoundedRectangle(cornerRadius: 13, style: .continuous))
        }
    }
}

private struct PracticeQuestionBottomPreferenceKey: PreferenceKey {
    static let defaultValue: CGFloat = 0

    static func reduce(value: inout CGFloat, nextValue: () -> CGFloat) {
        value = nextValue()
    }
}

private struct PracticeChoiceButton: View {
    let choice: PracticeChoiceContent
    let isSelected: Bool
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack(spacing: SaturnPathSpacing.medium) {
                Text(choice.id)
                    .font(SaturnPathTypography.bodyStrong)
                    .foregroundStyle(isSelected ? .white : SaturnPathTheme.primaryDeep)
                    .frame(width: 36, height: 36)
                    .background(isSelected ? SaturnPathTheme.primary : SaturnPathTheme.primarySoft, in: Circle())

                Text(choice.text)
                    .font(SaturnPathTypography.body)
                    .foregroundStyle(SaturnPathTheme.ink)
                    .multilineTextAlignment(.leading)

                Spacer()

                Image(systemName: isSelected ? "checkmark.circle.fill" : "circle")
                    .foregroundStyle(isSelected ? SaturnPathTheme.primaryDeep : SaturnPathTheme.softInk)
                    .accessibilityHidden(true)
            }
            .padding(SaturnPathSpacing.medium)
            .frame(maxWidth: .infinity, minHeight: 58, alignment: .leading)
            .background(SaturnPathTheme.surfaceStrong, in: RoundedRectangle(cornerRadius: 18, style: .continuous))
            .overlay {
                RoundedRectangle(cornerRadius: 18, style: .continuous)
                    .stroke(isSelected ? SaturnPathTheme.primary : SaturnPathTheme.lineStrong, lineWidth: isSelected ? 2 : 1)
            }
        }
        .buttonStyle(.plain)
        .accessibilityLabel("Choice \(choice.id), \(choice.text)")
        .accessibilityAddTraits(isSelected ? .isSelected : [])
        .accessibilityIdentifier("saturnpath.practice.choice.\(choice.id)")
    }
}

private struct PracticeTimerView: View {
    let accumulatedSeconds: TimeInterval
    let resumedAt: Date?
    let expectedSeconds: Int

    var body: some View {
        TimelineView(.periodic(from: .now, by: 1)) { context in
            let activeSeconds = resumedAt.map { max(0, context.date.timeIntervalSince($0)) } ?? 0
            let elapsed = max(0, Int(accumulatedSeconds + activeSeconds))
            Label(duration(elapsed), systemImage: "timer")
                .font(SaturnPathTypography.caption)
                .foregroundStyle(SaturnPathTheme.mutedInk)
                .padding(.horizontal, SaturnPathSpacing.small)
                .frame(minHeight: 36)
                .background(.thinMaterial, in: Capsule())
                .accessibilityLabel("Elapsed time \(duration(elapsed)). Target \(duration(expectedSeconds)).")
                .accessibilityIdentifier("saturnpath.practice.timer")
        }
    }

    private func duration(_ seconds: Int) -> String {
        String(format: "%d:%02d", seconds / 60, seconds % 60)
    }
}

private struct PracticeFeedbackView: View {
    @Bindable var model: PracticeViewModel
    let feedback: PracticeFeedbackContent
    let onContinue: () -> Void

    @Environment(\.appDependencies) private var dependencies
    @FocusState private var isOtherFieldFocused: Bool

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: SaturnPathSpacing.large) {
                VStack(alignment: .leading, spacing: SaturnPathSpacing.medium) {
                    Label(
                        feedback.correctness == .correct ? "Correct" : "Keep learning",
                        systemImage: feedback.correctness == .correct ? "checkmark.circle.fill" : "arrow.trianglehead.2.clockwise.rotate.90"
                    )
                    .font(SaturnPathTypography.metric)
                    .foregroundStyle(feedback.correctness == .correct ? SaturnPathTheme.mintDeep : SaturnPathTheme.coralDeep)

                    Text(feedback.headline)
                        .font(SaturnPathTypography.pageTitle)
                        .foregroundStyle(SaturnPathTheme.ink)
                        .accessibilityAddTraits(.isHeader)
                        .accessibilityIdentifier("saturnpath.practice.feedback")
                }
                .spGlassCard(padding: SaturnPathSpacing.large, radius: SaturnPathRadius.hero)

                VStack(alignment: .leading, spacing: SaturnPathSpacing.small) {
                    Text("Explanation")
                        .font(SaturnPathTypography.bodyStrong)
                        .foregroundStyle(SaturnPathTheme.ink)
                    Text(feedback.explanation)
                        .font(SaturnPathTypography.body)
                        .foregroundStyle(SaturnPathTheme.mutedInk)
                        .lineSpacing(4)
                }
                .spGlassCard(padding: SaturnPathSpacing.large, radius: SaturnPathRadius.card)

                if feedback.correctness == .incorrect, !feedback.classificationOptions.isEmpty {
                    classificationCard
                }

                feedbackSignal(icon: "timer", text: feedback.pacingMessage, color: SaturnPathTheme.sky)
                PracticePathChangeView(pathChange: feedback.pathChange)

                if let adaptation = feedback.adaptation {
                    PracticeAdaptationView(adaptation: adaptation)
                }

                Button(nextButtonTitle, action: onContinue)
                    .buttonStyle(SaturnPathPrimaryButtonStyle())
                    .disabled(!model.canContinueFromFeedback)
                    .opacity(model.canContinueFromFeedback ? 1 : 0.55)
                    .accessibilityIdentifier("saturnpath.practice.next")
            }
            .frame(maxWidth: 620)
            .padding(SaturnPathSpacing.large)
            .frame(maxWidth: .infinity)
        }
        .scrollIndicators(.hidden)
    }

    private var classificationCard: some View {
        VStack(alignment: .leading, spacing: SaturnPathSpacing.medium) {
            VStack(alignment: .leading, spacing: SaturnPathSpacing.xSmall) {
                Text("What got in the way?")
                    .font(SaturnPathTypography.bodyStrong)
                    .foregroundStyle(SaturnPathTheme.ink)
                    .accessibilityAddTraits(.isHeader)
                    .accessibilityIdentifier("saturnpath.practice.classification")

                Text("Choose one so the next review fits the mistake.")
                    .font(SaturnPathTypography.caption)
                    .foregroundStyle(SaturnPathTheme.mutedInk)
            }

            VStack(spacing: SaturnPathSpacing.xSmall) {
                ForEach(feedback.classificationOptions) { option in
                    classificationButton(option)
                }
            }

            if model.selectedClassification?.kind == .other, model.classificationReceipt == nil {
                VStack(alignment: .leading, spacing: SaturnPathSpacing.xSmall) {
                    Text("What happened?")
                        .font(SaturnPathTypography.caption)
                        .foregroundStyle(SaturnPathTheme.ink)

                    TextField(
                        "Add a short note",
                        text: Binding(
                            get: { model.otherClassificationText },
                            set: { newValue in
                                model.updateOtherClassificationText(newValue)
                            }
                        ),
                        axis: .vertical
                    )
                    .focused($isOtherFieldFocused)
                    .lineLimit(2...3)
                    .padding(.horizontal, SaturnPathSpacing.medium)
                    .frame(minHeight: 54)
                    .background(
                        SaturnPathTheme.canvas,
                        in: RoundedRectangle(cornerRadius: SaturnPathRadius.control, style: .continuous)
                    )
                    .overlay {
                        RoundedRectangle(cornerRadius: SaturnPathRadius.control, style: .continuous)
                            .stroke(SaturnPathTheme.lineStrong, lineWidth: 1)
                    }
                    .accessibilityIdentifier("saturnpath.practice.classification.other-text")

                    HStack {
                        Text("Keep it brief—no personal details.")
                        Spacer()
                        Text("\(model.otherClassificationText.count)/\(PracticeViewModel.otherClassificationLimit)")
                    }
                    .font(.system(.caption2, design: .rounded))
                    .foregroundStyle(SaturnPathTheme.softInk)

                    Button {
                        Task {
                            await model.saveOtherClassification(using: dependencies.practiceRepository)
                        }
                    } label: {
                        if model.isClassifying {
                            ProgressView()
                                .tint(.white)
                                .accessibilityLabel("Saving mistake reason")
                        } else {
                            Text("Save Reason")
                        }
                    }
                    .buttonStyle(SaturnPathPrimaryButtonStyle())
                    .disabled(!model.canSaveOtherClassification)
                    .opacity(model.canSaveOtherClassification ? 1 : 0.55)
                    .accessibilityIdentifier("saturnpath.practice.classification.other-save")
                }
            }

            if let failure = model.classificationFailure {
                Label(failure.classificationMessage, systemImage: "exclamationmark.circle")
                    .font(SaturnPathTypography.caption)
                    .foregroundStyle(SaturnPathTheme.coralDeep)
                    .accessibilityIdentifier("saturnpath.practice.classification.error")
            }

            if model.classificationReceipt != nil {
                Label("Reason saved", systemImage: "checkmark.circle.fill")
                    .font(SaturnPathTypography.caption)
                    .foregroundStyle(SaturnPathTheme.mintDeep)
                    .accessibilityIdentifier("saturnpath.practice.classification.saved")
            }
        }
        .spGlassCard(padding: SaturnPathSpacing.large, radius: SaturnPathRadius.card)
        .onChange(of: model.selectedClassificationID) { _, selectedID in
            guard
                let selectedID,
                feedback.classificationOptions.first(where: { $0.id == selectedID })?.kind == .other
            else {
                return
            }
            isOtherFieldFocused = true
        }
    }

    private func classificationButton(_ option: MistakeClassificationOptionContent) -> some View {
        let isSelected = model.selectedClassificationID == option.id
        let isSaved = isSelected && model.classificationReceipt != nil

        return Button {
            Task {
                await model.selectClassification(option, using: dependencies.practiceRepository)
            }
        } label: {
            HStack(spacing: SaturnPathSpacing.small) {
                Image(systemName: isSaved ? "checkmark.circle.fill" : isSelected ? "circle.inset.filled" : "circle")
                    .foregroundStyle(isSelected ? SaturnPathTheme.primaryDeep : SaturnPathTheme.softInk)
                    .accessibilityHidden(true)

                Text(option.label)
                    .font(SaturnPathTypography.caption)
                    .foregroundStyle(SaturnPathTheme.ink)
                    .multilineTextAlignment(.leading)

                Spacer()

                if isSelected && model.isClassifying {
                    ProgressView()
                        .controlSize(.small)
                        .accessibilityLabel("Saving")
                }
            }
            .padding(.horizontal, SaturnPathSpacing.medium)
            .frame(maxWidth: .infinity, minHeight: 48, alignment: .leading)
            .background(
                isSelected ? SaturnPathTheme.primarySoft : SaturnPathTheme.canvas,
                in: RoundedRectangle(cornerRadius: 15, style: .continuous)
            )
            .overlay {
                RoundedRectangle(cornerRadius: 15, style: .continuous)
                    .stroke(isSelected ? SaturnPathTheme.primary.opacity(0.5) : SaturnPathTheme.lineStrong, lineWidth: 1)
            }
        }
        .buttonStyle(.plain)
        .disabled(model.isClassifying || model.classificationReceipt != nil)
        .accessibilityAddTraits(isSelected ? .isSelected : [])
        .accessibilityIdentifier("saturnpath.practice.classification.\(option.id)")
    }

    private func feedbackSignal(icon: String, text: String, color: Color) -> some View {
        HStack(spacing: SaturnPathSpacing.medium) {
            Image(systemName: icon)
                .foregroundStyle(color)
                .frame(width: 28)
                .accessibilityHidden(true)
            Text(text)
                .font(SaturnPathTypography.bodyStrong)
                .foregroundStyle(SaturnPathTheme.ink)
            Spacer()
        }
        .spGlassCard(padding: SaturnPathSpacing.medium, radius: SaturnPathRadius.card)
    }

    private var nextButtonTitle: String {
        switch feedback.nextAction {
        case .continuePractice:
            "Next Question"
        case .microSetSummary:
            "View Route Update"
        case .recommendedStop:
            "View Recommendation"
        case .sessionComplete:
            "View Summary"
        }
    }
}

private extension PracticeViewFailure {
    var classificationMessage: String {
        switch self {
        case .offline: "That reason needs a connection. Try again when you’re online."
        case .expiredSession: "Your session expired before the reason was saved."
        case .server: "That reason was not saved. Please try again."
        }
    }
}

private struct PracticePathChangeView: View {
    let pathChange: PracticePathChangeContent

    var body: some View {
        VStack(alignment: .leading, spacing: SaturnPathSpacing.medium) {
            HStack(spacing: SaturnPathSpacing.small) {
                Label("Path updated", systemImage: icon)
                    .font(SaturnPathTypography.bodyStrong)
                    .foregroundStyle(SaturnPathTheme.ink)

                Spacer()

                Text(pathChange.impactLabel)
                    .font(SaturnPathTypography.eyebrow)
                    .foregroundStyle(SaturnPathTheme.primaryDeep)
                    .padding(.horizontal, SaturnPathSpacing.small)
                    .padding(.vertical, SaturnPathSpacing.xSmall)
                    .background(SaturnPathTheme.primarySoft, in: Capsule())
            }

            ViewThatFits(in: .horizontal) {
                HStack(spacing: SaturnPathSpacing.small) {
                    routeStop(pathChange.beforeLabel, isDestination: false)
                    Image(systemName: "arrow.right")
                        .foregroundStyle(SaturnPathTheme.softInk)
                        .accessibilityHidden(true)
                    routeStop(pathChange.afterLabel, isDestination: true)
                }

                VStack(alignment: .leading, spacing: SaturnPathSpacing.small) {
                    routeStop(pathChange.beforeLabel, isDestination: false)
                    Image(systemName: "arrow.down")
                        .foregroundStyle(SaturnPathTheme.softInk)
                        .accessibilityHidden(true)
                    routeStop(pathChange.afterLabel, isDestination: true)
                }
            }
        }
        .spGlassCard(padding: SaturnPathSpacing.medium, radius: SaturnPathRadius.card)
        .accessibilityElement(children: .ignore)
        .accessibilityLabel(
            "Path updated from \(pathChange.beforeLabel) to \(pathChange.afterLabel). \(pathChange.impactLabel)."
        )
        .accessibilityIdentifier("saturnpath.practice.path-change")
    }

    private func routeStop(_ label: String, isDestination: Bool) -> some View {
        Text(label)
            .font(SaturnPathTypography.caption)
            .foregroundStyle(isDestination ? SaturnPathTheme.primaryDeep : SaturnPathTheme.mutedInk)
            .frame(maxWidth: .infinity, minHeight: 44, alignment: .leading)
            .padding(.horizontal, SaturnPathSpacing.small)
            .background(
                isDestination ? SaturnPathTheme.primarySoft : SaturnPathTheme.canvas,
                in: RoundedRectangle(cornerRadius: 13, style: .continuous)
            )
    }

    private var icon: String {
        switch pathChange.kind {
        case .routeSwap:
            "point.topleft.down.curvedto.point.bottomright.up"
        case .timeDelta:
            "timer"
        case .reviewAdded:
            "arrow.trianglehead.2.clockwise.rotate.90"
        case .workRemoved:
            "checkmark.circle"
        case .noChange:
            "equal.circle"
        }
    }
}

private struct PracticeAdaptationView: View {
    let adaptation: PracticeAdaptationContent

    var body: some View {
        HStack(alignment: .top, spacing: SaturnPathSpacing.medium) {
            Image(systemName: "sparkles")
                .font(.system(.title3, weight: .semibold))
                .foregroundStyle(SaturnPathTheme.primaryDeep)
                .frame(width: 44, height: 44)
                .background(SaturnPathTheme.surfaceStrong, in: RoundedRectangle(cornerRadius: 14, style: .continuous))
                .accessibilityHidden(true)

            VStack(alignment: .leading, spacing: SaturnPathSpacing.xSmall) {
                Text(adaptation.headline)
                    .font(SaturnPathTypography.bodyStrong)
                    .foregroundStyle(SaturnPathTheme.ink)
                Text(adaptation.detail)
                    .font(SaturnPathTypography.body)
                    .foregroundStyle(SaturnPathTheme.mutedInk)
                    .lineSpacing(3)
            }

            Spacer(minLength: 0)
        }
        .padding(SaturnPathSpacing.medium)
        .background(
            LinearGradient(
                colors: [SaturnPathTheme.primarySoft, SaturnPathTheme.skySoft],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            ),
            in: RoundedRectangle(cornerRadius: SaturnPathRadius.card, style: .continuous)
        )
        .overlay {
            RoundedRectangle(cornerRadius: SaturnPathRadius.card, style: .continuous)
                .stroke(SaturnPathTheme.primary.opacity(0.22), lineWidth: 1)
        }
        .accessibilityElement(children: .combine)
        .accessibilityIdentifier("saturnpath.practice.adaptation")
    }
}

private struct PracticeStopRecommendationView: View {
    let isWorking: Bool
    let onFinish: () -> Void
    let onKeepPracticing: () -> Void

    var body: some View {
        ScrollView {
            VStack(spacing: SaturnPathSpacing.xLarge) {
                Image(systemName: "checkmark")
                    .font(.system(size: 34, weight: .bold))
                    .foregroundStyle(.white)
                    .frame(width: 68, height: 68)
                    .background(SaturnPathTheme.mintDeep, in: Circle())
                    .accessibilityHidden(true)

                VStack(spacing: SaturnPathSpacing.small) {
                    Text("DAILY GOAL COMPLETE")
                        .font(SaturnPathTypography.eyebrow)
                        .tracking(1.1)
                        .foregroundStyle(SaturnPathTheme.primaryDeep)

                    Text("You’re good for today.")
                        .font(SaturnPathTypography.pageTitle)
                        .foregroundStyle(SaturnPathTheme.ink)
                        .multilineTextAlignment(.center)
                        .accessibilityAddTraits(.isHeader)

                    Text("SaturnPath has enough signal to adapt your next session. You can finish here or keep practicing.")
                        .font(SaturnPathTypography.body)
                        .foregroundStyle(SaturnPathTheme.mutedInk)
                        .multilineTextAlignment(.center)
                        .lineSpacing(4)
                }
                .accessibilityElement(children: .combine)
                .accessibilityIdentifier("saturnpath.practice.stop-recommendation")

                VStack(spacing: SaturnPathSpacing.small) {
                    Button(action: onFinish) {
                        if isWorking {
                            ProgressView()
                                .tint(.white)
                                .accessibilityLabel("Finishing session")
                        } else {
                            Text("Finish")
                        }
                    }
                    .buttonStyle(SaturnPathPrimaryButtonStyle())
                    .disabled(isWorking)
                    .accessibilityIdentifier("saturnpath.practice.stop.finish")

                    Button("Keep Practicing", action: onKeepPracticing)
                        .font(SaturnPathTypography.bodyStrong)
                        .foregroundStyle(SaturnPathTheme.primaryDeep)
                        .frame(maxWidth: .infinity, minHeight: 56)
                        .background(SaturnPathTheme.surfaceStrong, in: RoundedRectangle(cornerRadius: 18, style: .continuous))
                        .overlay {
                            RoundedRectangle(cornerRadius: 18, style: .continuous)
                                .stroke(SaturnPathTheme.primary.opacity(0.34), lineWidth: 1)
                        }
                        .disabled(isWorking)
                        .accessibilityIdentifier("saturnpath.practice.stop.keep")
                }
            }
            .frame(maxWidth: 560)
            .padding(.horizontal, SaturnPathSpacing.large)
            .padding(.vertical, SaturnPathSpacing.xxLarge)
            .frame(maxWidth: .infinity, minHeight: 620)
        }
        .scrollIndicators(.hidden)
    }
}

private struct PracticeSummaryView: View {
    let summary: PracticeSummaryContent
    let onFinish: () -> Void

    var body: some View {
        VStack(spacing: SaturnPathSpacing.xLarge) {
            Spacer()
            Image(systemName: "sparkles")
                .font(.system(size: 42, weight: .semibold))
                .foregroundStyle(SaturnPathTheme.primary)
                .accessibilityHidden(true)

            Text(summary.headline)
                .font(SaturnPathTypography.pageTitle)
                .foregroundStyle(SaturnPathTheme.ink)
                .multilineTextAlignment(.center)
                .accessibilityAddTraits(.isHeader)
                .accessibilityIdentifier("saturnpath.practice.summary")

            HStack(spacing: SaturnPathSpacing.small) {
                summaryMetric(value: summary.completedCount.formatted(), label: "Completed")
                summaryMetric(value: summary.correctCount.formatted(), label: "Correct")
                summaryMetric(value: "\(summary.minutesSaved)m", label: "Saved")
            }

            Button("Back to Home", action: onFinish)
                .buttonStyle(SaturnPathPrimaryButtonStyle())
                .accessibilityIdentifier("saturnpath.practice.finish")
            Spacer()
        }
        .frame(maxWidth: 620)
        .padding(SaturnPathSpacing.large)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }

    private func summaryMetric(value: String, label: String) -> some View {
        VStack(spacing: SaturnPathSpacing.xSmall) {
            Text(value)
                .font(SaturnPathTypography.metric)
                .foregroundStyle(SaturnPathTheme.primaryDeep)
            Text(label)
                .font(SaturnPathTypography.caption)
                .foregroundStyle(SaturnPathTheme.mutedInk)
        }
        .frame(maxWidth: .infinity)
        .spGlassCard(padding: SaturnPathSpacing.medium, radius: SaturnPathRadius.card)
    }
}

private struct PracticeLoadingView: View {
    var body: some View {
        VStack(spacing: SaturnPathSpacing.medium) {
            ProgressView()
                .controlSize(.large)
                .tint(SaturnPathTheme.primary)
            Text("Choosing the next useful question…")
                .font(SaturnPathTypography.bodyStrong)
                .foregroundStyle(SaturnPathTheme.mutedInk)
                .multilineTextAlignment(.center)
        }
        .padding(SaturnPathSpacing.large)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .accessibilityElement(children: .combine)
        .accessibilityLabel("Choosing the next useful question")
    }
}

private struct PracticeFailureView: View {
    let failure: PracticeViewFailure
    let retry: () -> Void

    var body: some View {
        VStack(spacing: SaturnPathSpacing.medium) {
            Image(systemName: failure == .offline ? "wifi.slash" : "exclamationmark.circle.fill")
                .font(.system(.largeTitle, weight: .semibold))
                .foregroundStyle(SaturnPathTheme.coral)
                .accessibilityHidden(true)
            Text(failure == .expiredSession ? "Please sign in again" : "Practice paused")
                .font(SaturnPathTypography.pageTitle)
                .foregroundStyle(SaturnPathTheme.ink)
            Text(failure == .offline ? "Reconnect, then try this practice session again." : "We couldn’t continue this session yet.")
                .font(SaturnPathTypography.body)
                .foregroundStyle(SaturnPathTheme.mutedInk)
                .multilineTextAlignment(.center)
            Button("Try Again", action: retry)
                .buttonStyle(SaturnPathPrimaryButtonStyle())
        }
        .frame(maxWidth: 380)
        .spGlassCard(padding: SaturnPathSpacing.xLarge, radius: SaturnPathRadius.hero)
        .padding(SaturnPathSpacing.large)
    }
}

#Preview("Practice") {
    PracticeView(onClose: {})
        .environment(\.appDependencies, .preview)
}
