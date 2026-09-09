import SwiftUI

struct SignInView: View {
    let onAuthenticated: (AppBootstrapViewContent) -> Void

    @Environment(\.appDependencies) private var dependencies
    @State private var model = AuthViewModel()
    @FocusState private var emailIsFocused: Bool

    var body: some View {
        ZStack {
            SaturnPathBackground()

            ScrollView {
                VStack(spacing: SaturnPathSpacing.xLarge) {
                    Spacer(minLength: 36)

                    SaturnPathBrandMark(size: 72)

                    VStack(spacing: SaturnPathSpacing.small) {
                        Text("Your shortest path to SAT progress.")
                            .font(SaturnPathTypography.pageTitle)
                            .foregroundStyle(SaturnPathTheme.ink)
                            .multilineTextAlignment(.center)
                            .accessibilityAddTraits(.isHeader)

                        Text("Sign in to keep your plan, practice, and review history together across devices.")
                            .font(SaturnPathTypography.body)
                            .foregroundStyle(SaturnPathTheme.mutedInk)
                            .multilineTextAlignment(.center)
                    }

                    VStack(spacing: SaturnPathSpacing.medium) {
                        Button {
                            Task {
                                if let bootstrap = await model.signInWithApple(using: dependencies.accountRepository) {
                                    onAuthenticated(bootstrap)
                                }
                            }
                        } label: {
                            Label("Continue with Apple", systemImage: "apple.logo")
                                .font(SaturnPathTypography.bodyStrong)
                                .foregroundStyle(.white)
                                .frame(maxWidth: .infinity, minHeight: 56)
                                .background(Color.black, in: RoundedRectangle(cornerRadius: 18, style: .continuous))
                        }
                        .buttonStyle(.plain)
                        .disabled(model.state == .submitting)
                        .accessibilityIdentifier("saturnpath.auth.apple")

                        HStack(spacing: SaturnPathSpacing.small) {
                            Rectangle().fill(SaturnPathTheme.line).frame(height: 1)
                            Text("or use email")
                                .font(SaturnPathTypography.caption)
                                .foregroundStyle(SaturnPathTheme.mutedInk)
                            Rectangle().fill(SaturnPathTheme.line).frame(height: 1)
                        }
                        .accessibilityHidden(true)

                        VStack(alignment: .leading, spacing: SaturnPathSpacing.xSmall) {
                            Text("Email address")
                                .font(SaturnPathTypography.caption)
                                .foregroundStyle(SaturnPathTheme.ink)

                            TextField("you@example.com", text: $model.email)
                                .font(SaturnPathTypography.body)
                                .textContentType(.emailAddress)
                                .keyboardType(.emailAddress)
                                .textInputAutocapitalization(.never)
                                .autocorrectionDisabled()
                                .focused($emailIsFocused)
                                .submitLabel(.send)
                                .onSubmit(sendEmailLink)
                                .padding(.horizontal, SaturnPathSpacing.medium)
                                .frame(minHeight: 54)
                                .background(SaturnPathTheme.surfaceStrong, in: RoundedRectangle(cornerRadius: SaturnPathRadius.control, style: .continuous))
                                .overlay {
                                    RoundedRectangle(cornerRadius: SaturnPathRadius.control, style: .continuous)
                                        .stroke(emailIsFocused ? SaturnPathTheme.primary : SaturnPathTheme.lineStrong, lineWidth: emailIsFocused ? 2 : 1)
                                }
                                .accessibilityIdentifier("saturnpath.auth.email")
                        }

                        Button("Send sign-in link", action: sendEmailLink)
                            .buttonStyle(SaturnPathPrimaryButtonStyle())
                            .disabled(!model.canSubmitEmail || model.state == .submitting)
                            .opacity(model.canSubmitEmail ? 1 : 0.55)
                            .accessibilityIdentifier("saturnpath.auth.email-submit")

                        statusMessage
                    }
                    .spGlassCard(padding: SaturnPathSpacing.large, radius: SaturnPathRadius.hero)

                    Text("By continuing, you agree to SaturnPath’s Terms and acknowledge the Privacy Policy.")
                        .font(.system(.caption2, design: .rounded, weight: .medium))
                        .foregroundStyle(SaturnPathTheme.mutedInk)
                        .multilineTextAlignment(.center)
                }
                .frame(maxWidth: 460)
                .padding(.horizontal, SaturnPathSpacing.large)
                .padding(.bottom, SaturnPathSpacing.xxLarge)
                .frame(maxWidth: .infinity)
            }
            .scrollIndicators(.hidden)
        }
    }

    @ViewBuilder
    private var statusMessage: some View {
        switch model.state {
        case .emailSent:
            Label("Check your inbox for a secure sign-in link.", systemImage: "checkmark.circle.fill")
                .foregroundStyle(SaturnPathTheme.mintDeep)
                .accessibilityIdentifier("saturnpath.auth.email-sent")
        case let .failure(message):
            Label(message, systemImage: "exclamationmark.circle.fill")
                .foregroundStyle(SaturnPathTheme.coralDeep)
                .accessibilityIdentifier("saturnpath.auth.error")
        case .submitting:
            ProgressView()
                .tint(SaturnPathTheme.primary)
                .accessibilityLabel("Signing in")
        case .idle:
            EmptyView()
        }
    }

    private func sendEmailLink() {
        Task {
            await model.sendEmailLink(using: dependencies.accountRepository)
        }
    }
}

#Preview("Sign in") {
    SignInView(onAuthenticated: { _ in })
        .environment(\.appDependencies, .preview)
}
