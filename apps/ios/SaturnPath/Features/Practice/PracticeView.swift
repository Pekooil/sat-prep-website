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
                    if let step = model.questionStep, model.phase != .summary {
                        Text("Question \(step.position) of \(step.totalCount)")
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
                PracticeFeedbackView(feedback: feedback) {
                    Task {
                        await model.advance(
                            using: dependencies.practiceRepository,
                            recoveryStore: dependencies.recoveryStore
                        )
                    }
                }
            }
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

    var body: some View {
        VStack(spacing: 0) {
            ScrollView {
                VStack(alignment: .leading, spacing: SaturnPathSpacing.large) {
                    questionHeader
                    Text(step.question.prompt)
                        .font(.system(.title3, design: .rounded, weight: .semibold))
                        .foregroundStyle(SaturnPathTheme.ink)
                        .lineSpacing(5)
                        .accessibilityAddTraits(.isHeader)
                        .accessibilityIdentifier("saturnpath.practice.prompt")

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
    let feedback: PracticeFeedbackContent
    let onContinue: () -> Void

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

                VStack(spacing: SaturnPathSpacing.small) {
                    feedbackSignal(icon: "timer", text: feedback.pacingMessage, color: SaturnPathTheme.sky)
                    feedbackSignal(icon: "point.topleft.down.curvedto.point.bottomright.up", text: feedback.pathDeltaMessage, color: SaturnPathTheme.primary)
                }

                Button(feedback.nextAction == .nextQuestion ? "Next" : "Finish", action: onContinue)
                    .buttonStyle(SaturnPathPrimaryButtonStyle())
                    .accessibilityIdentifier("saturnpath.practice.next")
            }
            .frame(maxWidth: 620)
            .padding(SaturnPathSpacing.large)
            .frame(maxWidth: .infinity)
        }
        .scrollIndicators(.hidden)
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
