import SwiftUI

struct AppShellView: View {
    var body: some View {
        ZStack {
            SaturnPathTheme.canvasGradient
                .ignoresSafeArea()

            Circle()
                .fill(SaturnPathTheme.primary.opacity(0.12))
                .frame(width: 300, height: 300)
                .blur(radius: 32)
                .offset(x: 150, y: -290)
                .accessibilityHidden(true)

            VStack(spacing: 28) {
                Spacer(minLength: 48)

                OrbitalMark()
                    .frame(width: 154, height: 154)
                    .accessibilityHidden(true)

                VStack(spacing: 10) {
                    Text("SaturnPath")
                        .font(.system(size: 38, weight: .bold, design: .rounded))
                        .foregroundStyle(SaturnPathTheme.ink)
                        .accessibilityIdentifier("saturnpath.shell.title")

                    Text("Your SAT path, simplified.")
                        .font(.system(size: 18, weight: .medium, design: .rounded))
                        .foregroundStyle(SaturnPathTheme.mutedInk)
                }
                .multilineTextAlignment(.center)

                HStack(spacing: 12) {
                    Image(systemName: "checkmark.seal.fill")
                        .font(.system(size: 20, weight: .semibold))
                        .foregroundStyle(SaturnPathTheme.mint)

                    VStack(alignment: .leading, spacing: 2) {
                        Text("iOS foundation ready")
                            .font(.system(size: 16, weight: .semibold, design: .rounded))
                            .foregroundStyle(SaturnPathTheme.ink)

                        Text(SaturnPathEnvironment.current.label)
                            .font(.system(size: 13, weight: .medium, design: .rounded))
                            .foregroundStyle(SaturnPathTheme.mutedInk)
                    }

                    Spacer(minLength: 0)
                }
                .padding(.horizontal, 18)
                .frame(maxWidth: 340, minHeight: 72)
                .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 24, style: .continuous))
                .overlay {
                    RoundedRectangle(cornerRadius: 24, style: .continuous)
                        .stroke(Color.white.opacity(0.82), lineWidth: 1)
                }
                .shadow(color: SaturnPathTheme.shadow, radius: 24, y: 14)
                .accessibilityElement(children: .combine)
                .accessibilityLabel("iOS foundation ready, \(SaturnPathEnvironment.current.label)")
                .accessibilityIdentifier("saturnpath.shell.status")

                Spacer()

                Text("Build 1 · iOS 18+")
                    .font(.system(size: 12, weight: .semibold, design: .rounded))
                    .foregroundStyle(SaturnPathTheme.softInk)
                    .padding(.bottom, 10)
            }
            .padding(.horizontal, 24)
        }
    }
}

private struct OrbitalMark: View {
    var body: some View {
        ZStack {
            Circle()
                .stroke(SaturnPathTheme.primary.opacity(0.14), lineWidth: 24)

            Circle()
                .trim(from: 0.04, to: 0.87)
                .stroke(
                    AngularGradient(
                        colors: [SaturnPathTheme.primary, SaturnPathTheme.sky, SaturnPathTheme.primary],
                        center: .center
                    ),
                    style: StrokeStyle(lineWidth: 24, lineCap: .round)
                )
                .rotationEffect(.degrees(-90))

            Circle()
                .trim(from: 0.17, to: 0.72)
                .stroke(
                    SaturnPathTheme.mint,
                    style: StrokeStyle(lineWidth: 17, lineCap: .round)
                )
                .padding(29)
                .rotationEffect(.degrees(15))

            Circle()
                .fill(.white.opacity(0.84))
                .frame(width: 45, height: 45)
                .overlay {
                    Image(systemName: "sparkles")
                        .font(.system(size: 19, weight: .bold))
                        .foregroundStyle(SaturnPathTheme.primary)
                }
                .shadow(color: SaturnPathTheme.shadow, radius: 14, y: 8)
        }
    }
}

#Preview("iPhone shell") {
    AppShellView()
}
