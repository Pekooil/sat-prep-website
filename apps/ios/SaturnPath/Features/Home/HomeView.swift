import SwiftUI

struct HomeView: View {
    let onOpenProfile: () -> Void

    @Environment(\.appDependencies) private var dependencies
    @State private var model = HomeViewModel()
    @State private var showsPractice = false

    var body: some View {
        NavigationStack {
            ZStack {
                SaturnPathBackground()

                VStack(spacing: 0) {
                    SaturnPathAppHeader(
                        profileLabel: "DW",
                        onProfileSelected: onOpenProfile
                    )

                    content
                }
            }
            .toolbar(.hidden, for: .navigationBar)
        }
        .task {
            await model.load(using: dependencies.homeRepository)
        }
        .fullScreenCover(isPresented: $showsPractice) {
            PracticeView {
                showsPractice = false
            }
        }
    }

    @ViewBuilder
    private var content: some View {
        switch model.state {
        case .idle, .loading:
            HomeLoadingView()
        case .empty:
            HomeStatusView(
                systemImage: "sparkles",
                title: "Your path is almost ready",
                message: "Finish onboarding to build today’s focused recommendation.",
                actionTitle: nil,
                action: nil
            )
        case let .content(content):
            HomeDashboardView(content: content) {
                showsPractice = true
            }
        case let .failure(failure):
            HomeStatusView(
                systemImage: failure.systemImage,
                title: failure.title,
                message: failure.message,
                actionTitle: failure == .expiredSession ? "Sign In" : "Try Again"
            ) {
                Task {
                    await model.load(using: dependencies.homeRepository, force: true)
                }
            }
        }
    }
}

private struct HomeDashboardView: View {
    let content: HomeViewContent
    let onStartPractice: () -> Void

    var body: some View {
        ScrollView {
            VStack(spacing: SaturnPathSpacing.medium) {
                HStack(alignment: .bottom, spacing: SaturnPathSpacing.medium) {
                    VStack(alignment: .leading, spacing: SaturnPathSpacing.xSmall) {
                        Text(Date.now.formatted(.dateTime.weekday(.wide).month(.wide).day()))
                            .font(SaturnPathTypography.eyebrow)
                            .tracking(1.1)
                            .textCase(.uppercase)
                            .foregroundStyle(SaturnPathTheme.primaryDeep)

                        Text(content.statusMessage)
                            .font(SaturnPathTypography.pageTitle)
                            .foregroundStyle(SaturnPathTheme.ink)
                            .accessibilityAddTraits(.isHeader)
                            .accessibilityIdentifier("saturnpath.home.title")
                    }

                    Spacer(minLength: 0)

                    Text("\(content.daysUntilSAT) days")
                        .font(SaturnPathTypography.caption)
                        .foregroundStyle(SaturnPathTheme.mutedInk)
                        .padding(.horizontal, SaturnPathSpacing.small)
                        .frame(minHeight: 32)
                        .background(.thinMaterial, in: Capsule())
                        .accessibilityLabel("\(content.daysUntilSAT) days until the SAT")
                }

                SaturnPathProgressRings(
                    overall: content.overallProgress,
                    math: content.mathProgress,
                    readingWriting: content.readingWritingProgress,
                    score: content.scoreEstimate,
                    scoreRange: content.scoreRange
                )

                HStack(alignment: .top, spacing: SaturnPathSpacing.small) {
                    SaturnPathMetricCard(
                        label: "Target score",
                        value: content.targetScore.formatted(),
                        note: "Keep climbing"
                    )

                    SaturnPathMetricCard(
                        label: "Next SAT",
                        value: content.satDateLabel,
                        note: "On track"
                    )
                }

                recommendationCard
            }
            .padding(.horizontal, SaturnPathSpacing.large)
            .padding(.top, SaturnPathSpacing.xSmall)
            .padding(.bottom, SaturnPathLayout.tabBarContentClearance)
        }
        .scrollIndicators(.hidden)
    }

    private var recommendationCard: some View {
        VStack(spacing: SaturnPathSpacing.medium) {
            HStack(alignment: .top, spacing: SaturnPathSpacing.medium) {
                VStack(alignment: .leading, spacing: SaturnPathSpacing.xSmall) {
                    Text("Recommended today")
                        .font(SaturnPathTypography.bodyStrong)
                        .foregroundStyle(SaturnPathTheme.ink)

                    Text("\(content.recommendedMinutes) min")
                        .font(SaturnPathTypography.metric)
                        .foregroundStyle(SaturnPathTheme.primaryDeep)

                    Text("\(content.practiceMinutes) practice · \(content.reviewMinutes) review")
                        .font(SaturnPathTypography.caption)
                        .foregroundStyle(SaturnPathTheme.mutedInk)
                }

                Spacer(minLength: SaturnPathSpacing.small)

                VStack(alignment: .trailing, spacing: 2) {
                    Text("\(content.minutesSaved)")
                        .font(SaturnPathTypography.metric)
                        .foregroundStyle(SaturnPathTheme.mintDeep)
                    Text("min saved")
                        .font(SaturnPathTypography.caption)
                        .foregroundStyle(SaturnPathTheme.mintDeep)
                    Text("\(content.questionsRemoved) low-value skipped")
                        .font(.system(.caption2, design: .rounded, weight: .semibold))
                        .foregroundStyle(SaturnPathTheme.mutedInk)
                        .multilineTextAlignment(.trailing)
                }
                .padding(.horizontal, SaturnPathSpacing.small)
                .padding(.vertical, SaturnPathSpacing.xSmall)
                .background(SaturnPathTheme.mintSoft, in: RoundedRectangle(cornerRadius: 14, style: .continuous))
            }

            GeometryReader { proxy in
                HStack(spacing: 5) {
                    Capsule()
                        .fill(SaturnPathTheme.primary)
                        .frame(width: proxy.size.width * practiceFraction)
                    Capsule()
                        .fill(SaturnPathTheme.mint)
                }
            }
            .frame(height: 8)
            .accessibilityHidden(true)

            HStack {
                Label("Practice", systemImage: "circle.fill")
                    .foregroundStyle(SaturnPathTheme.primaryDeep)
                Spacer()
                Label("Review", systemImage: "circle.fill")
                    .foregroundStyle(SaturnPathTheme.mintDeep)
            }
            .font(.system(.caption2, design: .rounded, weight: .semibold))

            Button(action: onStartPractice) {
                HStack(spacing: SaturnPathSpacing.small) {
                    Text("Start Practicing")
                    Image(systemName: "chevron.right")
                        .font(.system(.body, weight: .bold))
                }
            }
            .buttonStyle(SaturnPathPrimaryButtonStyle())
            .accessibilityHint("Starts today’s adaptive SAT practice")
            .accessibilityIdentifier("saturnpath.home.start")
        }
        .spGlassCard(padding: SaturnPathSpacing.medium, radius: SaturnPathRadius.card)
    }

    private var practiceFraction: Double {
        guard content.recommendedMinutes > 0 else {
            return 0.5
        }
        return min(max(Double(content.practiceMinutes) / Double(content.recommendedMinutes), 0.1), 0.9)
    }
}

private struct HomeLoadingView: View {
    var body: some View {
        VStack(spacing: SaturnPathSpacing.large) {
            ProgressView()
                .controlSize(.large)
                .tint(SaturnPathTheme.primary)

            Text("Preparing your path…")
                .font(SaturnPathTypography.bodyStrong)
                .foregroundStyle(SaturnPathTheme.mutedInk)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .accessibilityElement(children: .combine)
        .accessibilityLabel("Preparing your path")
        .accessibilityIdentifier("saturnpath.home.loading")
    }
}

private struct HomeStatusView: View {
    let systemImage: String
    let title: String
    let message: String
    let actionTitle: String?
    let action: (() -> Void)?

    var body: some View {
        VStack(spacing: SaturnPathSpacing.medium) {
            Image(systemName: systemImage)
                .font(.system(.largeTitle, weight: .semibold))
                .foregroundStyle(SaturnPathTheme.primary)
                .frame(width: 64, height: 64)
                .background(SaturnPathTheme.primarySoft, in: RoundedRectangle(cornerRadius: 20, style: .continuous))
                .accessibilityHidden(true)

            Text(title)
                .font(SaturnPathTypography.pageTitle)
                .foregroundStyle(SaturnPathTheme.ink)
                .multilineTextAlignment(.center)
                .accessibilityAddTraits(.isHeader)

            Text(message)
                .font(SaturnPathTypography.body)
                .foregroundStyle(SaturnPathTheme.mutedInk)
                .multilineTextAlignment(.center)

            if let actionTitle, let action {
                Button(actionTitle, action: action)
                    .buttonStyle(SaturnPathPrimaryButtonStyle())
            }
        }
        .frame(maxWidth: 360)
        .spGlassCard(padding: SaturnPathSpacing.xLarge, radius: SaturnPathRadius.hero)
        .padding(SaturnPathSpacing.large)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .accessibilityIdentifier("saturnpath.home.status")
    }
}

#Preview("Home") {
    HomeView(onOpenProfile: {})
        .environment(\.appDependencies, .preview)
}
