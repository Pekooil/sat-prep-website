import SwiftUI

struct AppFlowView: View {
    @Environment(\.appDependencies) private var dependencies
    @State private var model = AppFlowViewModel()

    var body: some View {
        Group {
            switch model.state {
            case .loading:
                RootLoadingView()
            case .signedOut:
                SignInView(onAuthenticated: model.didAuthenticate)
            case .onboarding:
                OnboardingView(onCompleted: model.didCompleteOnboarding)
            case .main:
                MainTabView()
            case let .failure(failure):
                RootFailureView(failure: failure) {
                    Task {
                        await model.load(using: dependencies.bootstrapRepository)
                    }
                }
            }
        }
        .task {
            guard model.state == .loading else {
                return
            }
            await model.load(using: dependencies.bootstrapRepository)
        }
    }
}

private struct RootLoadingView: View {
    var body: some View {
        ZStack {
            SaturnPathBackground()
            VStack(spacing: SaturnPathSpacing.medium) {
                SaturnPathBrandMark(size: 54)
                ProgressView()
                    .tint(SaturnPathTheme.primary)
                Text("Finding your path…")
                    .font(SaturnPathTypography.bodyStrong)
                    .foregroundStyle(SaturnPathTheme.mutedInk)
            }
            .accessibilityElement(children: .combine)
            .accessibilityLabel("Finding your path")
        }
    }
}

private struct RootFailureView: View {
    let failure: AppFlowFailure
    let retry: () -> Void

    var body: some View {
        ZStack {
            SaturnPathBackground()
            VStack(spacing: SaturnPathSpacing.medium) {
                Image(systemName: failure == .offline ? "wifi.slash" : "exclamationmark.arrow.trianglehead.2.clockwise.rotate.90")
                    .font(.system(.largeTitle, weight: .semibold))
                    .foregroundStyle(SaturnPathTheme.primary)
                    .accessibilityHidden(true)

                Text(failure == .offline ? "You’re offline" : "We couldn’t load SaturnPath")
                    .font(SaturnPathTypography.pageTitle)
                    .foregroundStyle(SaturnPathTheme.ink)
                    .multilineTextAlignment(.center)

                Text("Check your connection and try again.")
                    .font(SaturnPathTypography.body)
                    .foregroundStyle(SaturnPathTheme.mutedInk)
                    .multilineTextAlignment(.center)

                Button("Try Again", action: retry)
                    .buttonStyle(SaturnPathPrimaryButtonStyle())
            }
            .frame(maxWidth: 360)
            .spGlassCard(padding: SaturnPathSpacing.xLarge, radius: SaturnPathRadius.hero)
            .padding(SaturnPathSpacing.large)
        }
    }
}

#Preview("Root flow") {
    AppFlowView()
        .environment(\.appDependencies, .preview)
}
