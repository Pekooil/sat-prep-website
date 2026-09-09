import SwiftUI

struct OnboardingView: View {
    let onCompleted: (AppBootstrapViewContent) -> Void

    @Environment(\.appDependencies) private var dependencies
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var model = OnboardingViewModel()

    var body: some View {
        ZStack {
            SaturnPathBackground()

            VStack(spacing: 0) {
                header

                ScrollView {
                    VStack(spacing: SaturnPathSpacing.xLarge) {
                        stepHeading
                        stepContent
                    }
                    .frame(maxWidth: 520)
                    .padding(.horizontal, SaturnPathSpacing.large)
                    .padding(.top, SaturnPathSpacing.medium)
                    .padding(.bottom, SaturnPathSpacing.large)
                    .frame(maxWidth: .infinity)
                }
                .scrollIndicators(.hidden)

                controls
            }
        }
        .animation(SaturnPathMotion.standard(reduceMotion: reduceMotion), value: model.step)
    }

    private var header: some View {
        HStack(spacing: SaturnPathSpacing.small) {
            SaturnPathBrandMark()
            Text("SaturnPath")
                .font(SaturnPathTypography.sectionTitle)
                .foregroundStyle(SaturnPathTheme.ink)

            Spacer()

            Text("Step \(model.step.position) of \(OnboardingStep.allCases.count)")
                .font(SaturnPathTypography.caption)
                .foregroundStyle(SaturnPathTheme.mutedInk)
        }
        .padding(.horizontal, SaturnPathSpacing.large)
        .padding(.vertical, SaturnPathSpacing.small)
    }

    private var stepHeading: some View {
        VStack(alignment: .leading, spacing: SaturnPathSpacing.small) {
            GeometryReader { proxy in
                ZStack(alignment: .leading) {
                    Capsule().fill(SaturnPathTheme.line)
                    Capsule()
                        .fill(SaturnPathTheme.primary)
                        .frame(width: proxy.size.width * progress)
                }
            }
            .frame(height: 7)
            .accessibilityLabel("Onboarding progress")
            .accessibilityValue("Step \(model.step.position) of \(OnboardingStep.allCases.count)")

            Text(eyebrow)
                .font(SaturnPathTypography.eyebrow)
                .tracking(1.1)
                .textCase(.uppercase)
                .foregroundStyle(SaturnPathTheme.primaryDeep)

            Text(title)
                .font(SaturnPathTypography.pageTitle)
                .foregroundStyle(SaturnPathTheme.ink)
                .accessibilityAddTraits(.isHeader)
                .accessibilityIdentifier("saturnpath.onboarding.title")

            Text(message)
                .font(SaturnPathTypography.body)
                .foregroundStyle(SaturnPathTheme.mutedInk)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    @ViewBuilder
    private var stepContent: some View {
        switch model.step {
        case .scores:
            scoreStep
        case .schedule:
            scheduleStep
        case .privacy:
            privacyStep
        }
    }

    private var scoreStep: some View {
        VStack(spacing: SaturnPathSpacing.medium) {
            scoreControl(
                label: "Current score",
                value: $model.draft.currentScore,
                hint: "Your latest official or practice score"
            )

            scoreControl(
                label: "Target score",
                value: $model.draft.targetScore,
                hint: "The score you’re working toward"
            )
        }
    }

    private var scheduleStep: some View {
        VStack(alignment: .leading, spacing: SaturnPathSpacing.large) {
            VStack(alignment: .leading, spacing: SaturnPathSpacing.xSmall) {
                Text("SAT date")
                    .font(SaturnPathTypography.bodyStrong)
                    .foregroundStyle(SaturnPathTheme.ink)

                DatePicker(
                    "SAT date",
                    selection: $model.draft.testDate,
                    in: Date.now...latestTestDate,
                    displayedComponents: .date
                )
                .labelsHidden()
                .datePickerStyle(.graphical)
                .tint(SaturnPathTheme.primaryDeep)
                .accessibilityIdentifier("saturnpath.onboarding.date")
            }

            VStack(alignment: .leading, spacing: SaturnPathSpacing.xSmall) {
                Text("Timing accommodation")
                    .font(SaturnPathTypography.bodyStrong)
                    .foregroundStyle(SaturnPathTheme.ink)

                Picker("Timing accommodation", selection: $model.draft.timingAccommodation) {
                    ForEach(TimingAccommodation.allCases, id: \.self) { accommodation in
                        Text(accommodation.title).tag(accommodation)
                    }
                }
                .pickerStyle(.segmented)
                .accessibilityIdentifier("saturnpath.onboarding.timing")
            }
        }
        .spGlassCard(padding: SaturnPathSpacing.large, radius: SaturnPathRadius.hero)
    }

    private var privacyStep: some View {
        VStack(alignment: .leading, spacing: SaturnPathSpacing.large) {
            Image(systemName: "hand.raised.fill")
                .font(.system(.title, weight: .semibold))
                .foregroundStyle(SaturnPathTheme.primary)
                .frame(width: 54, height: 54)
                .background(SaturnPathTheme.primarySoft, in: RoundedRectangle(cornerRadius: 17, style: .continuous))
                .accessibilityHidden(true)

            Toggle(isOn: $model.draft.scratchAnalysisEnabled) {
                VStack(alignment: .leading, spacing: 3) {
                    Text("Help analyze my scratchwork")
                        .font(SaturnPathTypography.bodyStrong)
                        .foregroundStyle(SaturnPathTheme.ink)
                    Text("Optional. SaturnPath sends only supported structured signals, never raw scratchwork by default.")
                        .font(SaturnPathTypography.caption)
                        .foregroundStyle(SaturnPathTheme.mutedInk)
                }
            }
            .tint(SaturnPathTheme.primaryDeep)
            .accessibilityIdentifier("saturnpath.onboarding.scratch")

            Label("You can change this later in Profile.", systemImage: "lock.shield")
                .font(SaturnPathTypography.caption)
                .foregroundStyle(SaturnPathTheme.mutedInk)
        }
        .spGlassCard(padding: SaturnPathSpacing.large, radius: SaturnPathRadius.hero)
    }

    private var controls: some View {
        VStack(spacing: SaturnPathSpacing.small) {
            if case let .failure(message) = model.submissionState {
                Text(message)
                    .font(SaturnPathTypography.caption)
                    .foregroundStyle(SaturnPathTheme.coralDeep)
                    .multilineTextAlignment(.center)
                    .accessibilityIdentifier("saturnpath.onboarding.error")
            }

            HStack(spacing: SaturnPathSpacing.small) {
                if model.canGoBack {
                    Button("Back", action: model.goBack)
                        .font(SaturnPathTypography.bodyStrong)
                        .foregroundStyle(SaturnPathTheme.primaryDeep)
                        .frame(minWidth: 88, minHeight: 56)
                        .background(SaturnPathTheme.primarySoft, in: RoundedRectangle(cornerRadius: 18, style: .continuous))
                        .accessibilityIdentifier("saturnpath.onboarding.back")
                }

                Button(model.isFinalStep ? "Build My Path" : "Continue") {
                    if model.isFinalStep {
                        Task {
                            if let bootstrap = await model.complete(using: dependencies.onboardingRepository) {
                                onCompleted(bootstrap)
                            }
                        }
                    } else {
                        model.advance()
                    }
                }
                .buttonStyle(SaturnPathPrimaryButtonStyle())
                .disabled(model.submissionState == .submitting)
                .accessibilityIdentifier("saturnpath.onboarding.continue")
            }
        }
        .padding(.horizontal, SaturnPathSpacing.large)
        .padding(.top, SaturnPathSpacing.small)
        .padding(.bottom, SaturnPathSpacing.medium)
        .background(.ultraThinMaterial)
    }

    private func scoreControl(label: String, value: Binding<Int>, hint: String) -> some View {
        VStack(alignment: .leading, spacing: SaturnPathSpacing.xSmall) {
            HStack {
                VStack(alignment: .leading, spacing: 2) {
                    Text(label)
                        .font(SaturnPathTypography.bodyStrong)
                        .foregroundStyle(SaturnPathTheme.ink)
                    Text(hint)
                        .font(SaturnPathTypography.caption)
                        .foregroundStyle(SaturnPathTheme.mutedInk)
                }

                Spacer()

                Text(value.wrappedValue.formatted())
                    .font(SaturnPathTypography.metric)
                    .foregroundStyle(SaturnPathTheme.primaryDeep)
            }

            Stepper(label, value: value, in: 400...1600, step: 10)
                .labelsHidden()
                .frame(maxWidth: .infinity, alignment: .trailing)
                .accessibilityLabel(label)
                .accessibilityValue(value.wrappedValue.formatted())
                .accessibilityHint("Adjusts in ten-point increments")
        }
        .spGlassCard(padding: SaturnPathSpacing.large, radius: SaturnPathRadius.card)
    }

    private var progress: Double {
        Double(model.step.position) / Double(OnboardingStep.allCases.count)
    }

    private var latestTestDate: Date {
        Calendar.current.date(byAdding: .year, value: 2, to: .now) ?? .distantFuture
    }

    private var eyebrow: String {
        switch model.step {
        case .scores: "Start with your baseline"
        case .schedule: "Plan around your date"
        case .privacy: "You stay in control"
        }
    }

    private var title: String {
        switch model.step {
        case .scores: "Where are you now—and where are you headed?"
        case .schedule: "When are you taking the SAT?"
        case .privacy: "Choose how scratchwork helps."
        }
    }

    private var message: String {
        switch model.step {
        case .scores: "These scores anchor a conservative plan. You can update them anytime."
        case .schedule: "Your date and timing shape the pace of daily recommendations."
        case .privacy: "Scratch analysis is optional and off until you choose it."
        }
    }
}

#Preview("Onboarding") {
    OnboardingView(onCompleted: { _ in })
        .environment(\.appDependencies, .preview)
}
