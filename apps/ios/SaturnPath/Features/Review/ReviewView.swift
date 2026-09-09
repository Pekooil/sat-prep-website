import SwiftUI

struct ReviewView: View {
    let onOpenProfile: () -> Void

    @Environment(\.appDependencies) private var dependencies
    @State private var model = ReviewViewModel()
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
            guard model.phase == .idle else {
                return
            }
            await model.load(using: dependencies.reviewRepository)
        }
        .fullScreenCover(isPresented: $showsPractice) {
            PracticeView {
                showsPractice = false
                Task {
                    await model.load(using: dependencies.reviewRepository)
                }
            }
        }
    }

    @ViewBuilder
    private var content: some View {
        switch model.phase {
        case .idle, .loading:
            ReviewLoadingView()
        case .content:
            if let dashboard = model.dashboard {
                ReviewDashboardView(
                    model: model,
                    dashboard: dashboard,
                    onAction: perform
                )
            }
        case .empty:
            if let dashboard = model.dashboard {
                ReviewDashboardView(
                    model: model,
                    dashboard: dashboard,
                    onAction: perform
                )
            }
        case let .failure(failure):
            ReviewStatusView(
                systemImage: failure.systemImage,
                title: failure.title,
                message: failure.message,
                actionTitle: failure == .expiredSession ? "Sign In" : "Try Again"
            ) {
                Task {
                    await model.load(using: dependencies.reviewRepository)
                }
            }
        }
    }

    private func perform(_ action: ReviewItemAction, on item: ReviewItemContent) {
        Task {
            let shouldOpenPractice = await model.perform(
                action,
                on: item,
                using: dependencies.reviewRepository
            )
            if shouldOpenPractice {
                showsPractice = true
            }
        }
    }
}

private struct ReviewDashboardView: View {
    @Bindable var model: ReviewViewModel
    let dashboard: ReviewDashboardContent
    let onAction: (ReviewItemAction, ReviewItemContent) -> Void

    @Environment(\.appDependencies) private var dependencies

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: SaturnPathSpacing.large) {
                header
                filters

                if let actionFailure = model.actionFailure {
                    Label(actionFailure.inlineMessage, systemImage: "exclamationmark.circle")
                        .font(SaturnPathTypography.caption)
                        .foregroundStyle(SaturnPathTheme.coralDeep)
                        .padding(.horizontal, SaturnPathSpacing.small)
                        .accessibilityIdentifier("saturnpath.review.action-error")
                }

                if dashboard.items.isEmpty {
                    emptyCollection
                } else {
                    LazyVStack(spacing: SaturnPathSpacing.small) {
                        ForEach(dashboard.items) { item in
                            ReviewItemCard(
                                item: item,
                                isWorking: model.isWorking(on: item),
                                onAction: { action in
                                    onAction(action, item)
                                }
                            )
                        }
                    }
                }
            }
            .frame(maxWidth: 700, alignment: .leading)
            .padding(.horizontal, SaturnPathSpacing.large)
            .padding(.top, SaturnPathSpacing.xSmall)
            .padding(.bottom, SaturnPathLayout.tabBarContentClearance)
            .frame(maxWidth: .infinity)
        }
        .scrollIndicators(.hidden)
    }

    private var header: some View {
        VStack(alignment: .leading, spacing: SaturnPathSpacing.xSmall) {
            Text("Scheduled for you")
                .font(SaturnPathTypography.eyebrow)
                .tracking(1.1)
                .textCase(.uppercase)
                .foregroundStyle(SaturnPathTheme.primaryDeep)

            Text("Review")
                .font(SaturnPathTypography.pageTitle)
                .foregroundStyle(SaturnPathTheme.ink)
                .accessibilityAddTraits(.isHeader)
                .accessibilityIdentifier("saturnpath.review.title")

            Text(dashboard.headline)
                .font(SaturnPathTypography.body)
                .foregroundStyle(SaturnPathTheme.mutedInk)
        }
    }

    private var filters: some View {
        ScrollView(.horizontal) {
            HStack(spacing: SaturnPathSpacing.small) {
                ForEach(dashboard.filters) { filter in
                    Button {
                        Task {
                            await model.select(
                                filter.id,
                                using: dependencies.reviewRepository
                            )
                        }
                    } label: {
                        HStack(spacing: SaturnPathSpacing.xSmall) {
                            Image(systemName: filter.id.systemImage)
                                .accessibilityHidden(true)
                            Text(filter.id.title)
                            Text(filter.count.formatted())
                                .foregroundStyle(
                                    model.selectedCollection == filter.id
                                        ? SaturnPathTheme.primaryDeep
                                        : SaturnPathTheme.softInk
                                )
                        }
                        .font(SaturnPathTypography.caption)
                        .foregroundStyle(
                            model.selectedCollection == filter.id
                                ? SaturnPathTheme.primaryDeep
                                : SaturnPathTheme.mutedInk
                        )
                        .padding(.horizontal, SaturnPathSpacing.medium)
                        .frame(minHeight: 46)
                        .background(
                            model.selectedCollection == filter.id
                                ? SaturnPathTheme.primarySoft
                                : SaturnPathTheme.surfaceStrong,
                            in: RoundedRectangle(cornerRadius: 15, style: .continuous)
                        )
                        .overlay {
                            RoundedRectangle(cornerRadius: 15, style: .continuous)
                                .stroke(
                                    model.selectedCollection == filter.id
                                        ? SaturnPathTheme.primary.opacity(0.35)
                                        : SaturnPathTheme.lineStrong,
                                    lineWidth: 1
                                )
                        }
                    }
                    .buttonStyle(.plain)
                    .accessibilityLabel("\(filter.id.title), \(filter.count) items")
                    .accessibilityAddTraits(model.selectedCollection == filter.id ? .isSelected : [])
                    .accessibilityIdentifier("saturnpath.review.filter.\(filter.id.rawValue)")
                }
            }
        }
        .scrollIndicators(.hidden)
        .accessibilityIdentifier("saturnpath.review.filters")
    }

    private var emptyCollection: some View {
        VStack(spacing: SaturnPathSpacing.medium) {
            Image(systemName: "checkmark.circle")
                .font(.system(.largeTitle, weight: .semibold))
                .foregroundStyle(SaturnPathTheme.mintDeep)
                .accessibilityHidden(true)

            Text(model.selectedCollection.emptyTitle)
                .font(SaturnPathTypography.sectionTitle)
                .foregroundStyle(SaturnPathTheme.ink)
                .multilineTextAlignment(.center)

            Text(model.selectedCollection.emptyMessage)
                .font(SaturnPathTypography.body)
                .foregroundStyle(SaturnPathTheme.mutedInk)
                .multilineTextAlignment(.center)
        }
        .frame(maxWidth: .infinity)
        .spGlassCard(padding: SaturnPathSpacing.xLarge, radius: SaturnPathRadius.hero)
        .accessibilityElement(children: .combine)
        .accessibilityIdentifier("saturnpath.review.empty")
    }
}

private struct ReviewItemCard: View {
    let item: ReviewItemContent
    let isWorking: Bool
    let onAction: (ReviewItemAction) -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: SaturnPathSpacing.medium) {
            HStack(alignment: .top, spacing: SaturnPathSpacing.medium) {
                Image(systemName: item.state.systemImage)
                    .font(.system(.body, weight: .semibold))
                    .foregroundStyle(item.state.tint)
                    .frame(width: 44, height: 44)
                    .background(item.state.background, in: RoundedRectangle(cornerRadius: 14, style: .continuous))
                    .accessibilityHidden(true)

                VStack(alignment: .leading, spacing: 3) {
                    Text(item.title)
                        .font(SaturnPathTypography.bodyStrong)
                        .foregroundStyle(SaturnPathTheme.ink)
                    Text(item.context)
                        .font(SaturnPathTypography.caption)
                        .foregroundStyle(SaturnPathTheme.mutedInk)
                }

                Spacer(minLength: SaturnPathSpacing.xSmall)

                Text(item.state.title)
                    .font(SaturnPathTypography.eyebrow)
                    .foregroundStyle(item.state.tint)
                    .padding(.horizontal, SaturnPathSpacing.small)
                    .padding(.vertical, SaturnPathSpacing.xSmall)
                    .background(item.state.background, in: Capsule())
            }

            Text(item.summary)
                .font(SaturnPathTypography.body)
                .foregroundStyle(SaturnPathTheme.mutedInk)
                .lineSpacing(3)

            HStack(spacing: SaturnPathSpacing.xSmall) {
                Label(item.scheduleLabel, systemImage: "calendar")
                if item.lapseCount > 0 {
                    Label("\(item.lapseCount) \(item.lapseCount == 1 ? "lapse" : "lapses")", systemImage: "arrow.counterclockwise")
                }
            }
            .font(.system(.caption2, design: .rounded, weight: .semibold))
            .foregroundStyle(SaturnPathTheme.softInk)

            actionRow
        }
        .spGlassCard(padding: SaturnPathSpacing.medium, radius: SaturnPathRadius.card)
        .accessibilityIdentifier("saturnpath.review.item.\(item.id)")
    }

    @ViewBuilder
    private var actionRow: some View {
        let primaryAction = item.availableActions.first { $0 == .practiceNow || $0 == .resume }

        HStack(spacing: SaturnPathSpacing.small) {
            if let primaryAction {
                Button {
                    onAction(primaryAction)
                } label: {
                    if isWorking {
                        ProgressView()
                            .tint(.white)
                    } else {
                        Label(primaryAction.title, systemImage: "play.fill")
                    }
                }
                .font(SaturnPathTypography.caption)
                .foregroundStyle(.white)
                .frame(maxWidth: .infinity, minHeight: 48)
                .background(SaturnPathTheme.primary, in: RoundedRectangle(cornerRadius: 15, style: .continuous))
                .disabled(isWorking)
                .accessibilityIdentifier("saturnpath.review.item.\(item.id).primary")
            }

            if item.availableActions.contains(.save), !item.isSaved {
                actionButton(title: "Save", systemImage: "bookmark", action: .save)
            }

            if item.availableActions.contains(.deferAction) {
                actionButton(title: "Later", systemImage: "clock", action: .deferAction)
            }
        }
    }

    private func actionButton(
        title: String,
        systemImage: String,
        action: ReviewItemAction
    ) -> some View {
        Button {
            onAction(action)
        } label: {
            Label(title, systemImage: systemImage)
                .labelStyle(.iconOnly)
                .frame(width: 48, height: 48)
        }
        .buttonStyle(.plain)
        .foregroundStyle(SaturnPathTheme.primaryDeep)
        .background(SaturnPathTheme.primarySoft, in: RoundedRectangle(cornerRadius: 15, style: .continuous))
        .disabled(isWorking)
        .accessibilityLabel(title)
        .accessibilityIdentifier("saturnpath.review.item.\(item.id).\(action.rawValue)")
    }
}

private struct ReviewLoadingView: View {
    var body: some View {
        VStack(spacing: SaturnPathSpacing.medium) {
            ProgressView()
                .controlSize(.large)
                .tint(SaturnPathTheme.primary)
            Text("Loading your review path…")
                .font(SaturnPathTypography.bodyStrong)
                .foregroundStyle(SaturnPathTheme.mutedInk)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .accessibilityElement(children: .combine)
        .accessibilityLabel("Loading your review path")
        .accessibilityIdentifier("saturnpath.review.loading")
    }
}

private struct ReviewStatusView: View {
    let systemImage: String
    let title: String
    let message: String
    let actionTitle: String
    let action: () -> Void

    var body: some View {
        VStack(spacing: SaturnPathSpacing.medium) {
            Image(systemName: systemImage)
                .font(.system(.largeTitle, weight: .semibold))
                .foregroundStyle(SaturnPathTheme.primary)
                .accessibilityHidden(true)
            Text(title)
                .font(SaturnPathTypography.pageTitle)
                .foregroundStyle(SaturnPathTheme.ink)
            Text(message)
                .font(SaturnPathTypography.body)
                .foregroundStyle(SaturnPathTheme.mutedInk)
                .multilineTextAlignment(.center)
            Button(actionTitle, action: action)
                .buttonStyle(SaturnPathPrimaryButtonStyle())
        }
        .frame(maxWidth: 360)
        .spGlassCard(padding: SaturnPathSpacing.xLarge, radius: SaturnPathRadius.hero)
        .padding(SaturnPathSpacing.large)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .accessibilityIdentifier("saturnpath.review.status")
    }
}

private extension ReviewCollection {
    var title: String {
        switch self {
        case .due: "Due"
        case .learning: "Learning"
        case .retesting: "Retesting"
        case .resolved: "Resolved"
        case .saved: "Saved"
        }
    }

    var systemImage: String {
        switch self {
        case .due: "clock.badge.exclamationmark"
        case .learning: "book"
        case .retesting: "checkmark.arrow.trianglehead.counterclockwise"
        case .resolved: "checkmark.seal"
        case .saved: "bookmark"
        }
    }

    var emptyTitle: String {
        switch self {
        case .due: "Nothing due right now"
        case .learning: "No active corrections"
        case .retesting: "No retests scheduled"
        case .resolved: "Resolved mistakes will collect here"
        case .saved: "No saved mistakes yet"
        }
    }

    var emptyMessage: String {
        switch self {
        case .due: "SaturnPath will bring mistakes back when reviewing them has the most value."
        case .learning: "Correct an original mistake to begin its learning path."
        case .retesting: "A delayed retention check appears here when the server schedules it."
        case .resolved: "A mistake resolves only after its full server-directed review path succeeds."
        case .saved: "Save a useful mistake to keep it easy to find."
        }
    }
}

private extension ReviewItemState {
    var title: String {
        switch self {
        case .due: "Due"
        case .learning: "Learning"
        case .retesting: "Retesting"
        case .resolved: "Resolved"
        }
    }

    var systemImage: String {
        switch self {
        case .due: "clock.arrow.circlepath"
        case .learning: "book.pages"
        case .retesting: "arrow.trianglehead.2.clockwise.rotate.90"
        case .resolved: "checkmark.seal"
        }
    }

    var tint: Color {
        switch self {
        case .due: SaturnPathTheme.coralDeep
        case .learning: SaturnPathTheme.primaryDeep
        case .retesting: Color(red: 0.067, green: 0.384, blue: 0.627)
        case .resolved: SaturnPathTheme.mintDeep
        }
    }

    var background: Color {
        switch self {
        case .due: SaturnPathTheme.coralSoft
        case .learning: SaturnPathTheme.primarySoft
        case .retesting: SaturnPathTheme.skySoft
        case .resolved: SaturnPathTheme.mintSoft
        }
    }
}

private extension ReviewItemAction {
    var title: String {
        switch self {
        case .resume: "Resume"
        case .save: "Save"
        case .deferAction: "Later"
        case .practiceNow: "Practice Now"
        }
    }
}

private extension ReviewViewFailure {
    var systemImage: String {
        switch self {
        case .offline: "wifi.slash"
        case .expiredSession: "person.crop.circle.badge.exclamationmark"
        case .server: "exclamationmark.triangle"
        }
    }

    var title: String {
        switch self {
        case .offline: "Review is waiting for a connection"
        case .expiredSession: "Sign in to see your review path"
        case .server: "Review could not load"
        }
    }

    var message: String {
        switch self {
        case .offline: "Reconnect and try again. Your review schedule remains on the server."
        case .expiredSession: "Your session expired before SaturnPath could load your mistakes."
        case .server: "Something went wrong while loading the server-owned review state."
        }
    }

    var inlineMessage: String {
        switch self {
        case .offline: "That action needs a connection. Try again when you’re online."
        case .expiredSession: "Your session expired before the action was saved."
        case .server: "That action was not saved. Please try again."
        }
    }
}

#Preview("Review") {
    ReviewView(onOpenProfile: {})
        .environment(\.appDependencies, .preview)
}
