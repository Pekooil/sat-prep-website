import SwiftUI

enum AppTab: Hashable, CaseIterable, Sendable {
    case home
    case progress
    case review
    case profile

    var title: String {
        switch self {
        case .home: "Home"
        case .progress: "Progress"
        case .review: "Review"
        case .profile: "Profile"
        }
    }

    var systemImage: String {
        switch self {
        case .home: "house"
        case .progress: "chart.bar"
        case .review: "clock.arrow.circlepath"
        case .profile: "person"
        }
    }
}

struct MainTabView: View {
    @State private var selectedTab: AppTab = .home

    var body: some View {
        TabView(selection: $selectedTab) {
            HomeView {
                selectedTab = .profile
            }
            .tabItem {
                Label(AppTab.home.title, systemImage: AppTab.home.systemImage)
            }
            .tag(AppTab.home)

            PlaceholderFeatureView(
                eyebrow: "Your trajectory",
                title: "Progress",
                message: "Clear signals, not more homework.",
                systemImage: "chart.line.uptrend.xyaxis",
                accessibilityIdentifier: "saturnpath.progress.title"
            ) {
                selectedTab = .profile
            }
            .tabItem {
                Label(AppTab.progress.title, systemImage: AppTab.progress.systemImage)
            }
            .tag(AppTab.progress)

            PlaceholderFeatureView(
                eyebrow: "Scheduled for you",
                title: "Review",
                message: "Mistakes will appear here when the shared review API is ready.",
                systemImage: "arrow.trianglehead.2.clockwise.rotate.90",
                accessibilityIdentifier: "saturnpath.review.title"
            ) {
                selectedTab = .profile
            }
            .tabItem {
                Label(AppTab.review.title, systemImage: AppTab.review.systemImage)
            }
            .tag(AppTab.review)

            PlaceholderFeatureView(
                eyebrow: "Preferences",
                title: "Profile",
                message: "Account, test date, reminders, privacy, and accessibility settings will live here.",
                systemImage: "person.crop.circle",
                accessibilityIdentifier: "saturnpath.profile.title"
            ) {}
            .tabItem {
                Label(AppTab.profile.title, systemImage: AppTab.profile.systemImage)
            }
            .tag(AppTab.profile)
        }
        .tint(SaturnPathTheme.primaryDeep)
        .toolbarBackground(.visible, for: .tabBar)
        .toolbarBackground(.ultraThinMaterial, for: .tabBar)
        .accessibilityIdentifier("saturnpath.main-tabs")
    }
}

#Preview("Main tabs") {
    MainTabView()
        .environment(\.appDependencies, .preview)
}
