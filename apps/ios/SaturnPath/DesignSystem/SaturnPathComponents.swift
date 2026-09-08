import SwiftUI

struct SaturnPathBackground: View {
    var body: some View {
        ZStack {
            SaturnPathTheme.canvasGradient

            Circle()
                .fill(SaturnPathTheme.sky.opacity(0.18))
                .frame(width: 290, height: 290)
                .blur(radius: 24)
                .offset(x: -170, y: -340)

            Circle()
                .fill(SaturnPathTheme.coral.opacity(0.10))
                .frame(width: 260, height: 260)
                .blur(radius: 30)
                .offset(x: 180, y: -210)

            Circle()
                .fill(SaturnPathTheme.mint.opacity(0.10))
                .frame(width: 250, height: 250)
                .blur(radius: 30)
                .offset(x: -190, y: 360)
        }
        .ignoresSafeArea()
        .accessibilityHidden(true)
    }
}

struct SaturnPathBrandMark: View {
    var size: CGFloat = 32

    var body: some View {
        ZStack {
            RoundedRectangle(cornerRadius: size * 0.32, style: .continuous)
                .fill(
                    LinearGradient(
                        colors: [Color(red: 0.541, green: 0.486, blue: 1), SaturnPathTheme.primary],
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    )
                )

            Ellipse()
                .stroke(Color.white, lineWidth: max(1.8, size * 0.06))
                .frame(width: size * 0.58, height: size * 0.25)
                .rotationEffect(.degrees(-18))

            Circle()
                .fill(Color(red: 0.729, green: 1, blue: 0.922))
                .frame(width: size * 0.17, height: size * 0.17)
                .offset(x: size * 0.28, y: -size * 0.22)
        }
        .frame(width: size, height: size)
        .shadow(color: SaturnPathTheme.primary.opacity(0.28), radius: 9, y: 5)
        .accessibilityHidden(true)
    }
}

struct SaturnPathAppHeader: View {
    let profileLabel: String
    let onProfileSelected: () -> Void

    var body: some View {
        HStack(spacing: SaturnPathSpacing.small) {
            SaturnPathBrandMark()

            Text("SaturnPath")
                .font(SaturnPathTypography.sectionTitle)
                .foregroundStyle(SaturnPathTheme.ink)

            Spacer(minLength: SaturnPathSpacing.medium)

            Button(action: onProfileSelected) {
                Text(profileLabel)
                    .font(SaturnPathTypography.caption)
                    .foregroundStyle(.white)
                    .frame(width: 46, height: 46)
                    .background(
                        LinearGradient(
                            colors: [Color(red: 1, green: 0.58, blue: 0.55), SaturnPathTheme.coral],
                            startPoint: .topLeading,
                            endPoint: .bottomTrailing
                        ),
                        in: RoundedRectangle(cornerRadius: SaturnPathRadius.control, style: .continuous)
                    )
            }
            .buttonStyle(.plain)
            .accessibilityLabel("Open profile")
            .accessibilityIdentifier("saturnpath.header.profile")
        }
        .padding(.horizontal, SaturnPathSpacing.large)
        .padding(.top, SaturnPathSpacing.small)
        .padding(.bottom, SaturnPathSpacing.xSmall)
    }
}

struct SaturnPathMetricCard: View {
    let label: String
    let value: String
    let note: String

    var body: some View {
        VStack(alignment: .leading, spacing: SaturnPathSpacing.xSmall) {
            Text(label)
                .font(SaturnPathTypography.caption)
                .foregroundStyle(SaturnPathTheme.mutedInk)

            Text(value)
                .font(SaturnPathTypography.metric)
                .foregroundStyle(SaturnPathTheme.ink)

            Text(note)
                .font(SaturnPathTypography.caption)
                .foregroundStyle(SaturnPathTheme.primaryDeep)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .spGlassCard(padding: SaturnPathSpacing.medium, radius: 19)
    }
}

struct SaturnPathProgressRings: View {
    let overall: Double
    let math: Double
    let readingWriting: Double
    let score: Int
    let scoreRange: ClosedRange<Int>

    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    var body: some View {
        VStack(spacing: SaturnPathSpacing.medium) {
            ZStack {
                ring(progress: overall, color: SaturnPathTheme.primary, width: 20)
                    .padding(4)
                ring(progress: math, color: SaturnPathTheme.mint, width: 18)
                    .padding(31)
                ring(progress: readingWriting, color: SaturnPathTheme.coral, width: 16)
                    .padding(57)

                VStack(spacing: 3) {
                    Text("ESTIMATED")
                        .font(SaturnPathTypography.eyebrow)
                        .tracking(1.2)
                        .foregroundStyle(SaturnPathTheme.mutedInk)

                    Text(score.formatted())
                        .font(SaturnPathTypography.score)
                        .foregroundStyle(SaturnPathTheme.ink)
                        .minimumScaleFactor(0.7)

                    Text("\(scoreRange.lowerBound)–\(scoreRange.upperBound)")
                        .font(SaturnPathTypography.caption)
                        .foregroundStyle(SaturnPathTheme.mutedInk)
                }
                .frame(width: 110, height: 110)
                .background(.thinMaterial, in: Circle())
            }
            .frame(width: 236, height: 236)

            ViewThatFits(in: .horizontal) {
                HStack(spacing: SaturnPathSpacing.medium) {
                    legend(label: "Overall", value: overall, color: SaturnPathTheme.primary)
                    legend(label: "Math", value: math, color: SaturnPathTheme.mint)
                    legend(label: "R&W", value: readingWriting, color: SaturnPathTheme.coral)
                }

                VStack(alignment: .leading, spacing: SaturnPathSpacing.xSmall) {
                    legend(label: "Overall", value: overall, color: SaturnPathTheme.primary)
                    legend(label: "Math", value: math, color: SaturnPathTheme.mint)
                    legend(label: "Reading and Writing", value: readingWriting, color: SaturnPathTheme.coral)
                }
            }
        }
        .frame(maxWidth: .infinity)
        .spGlassCard(padding: SaturnPathSpacing.large, radius: SaturnPathRadius.hero)
        .accessibilityElement(children: .ignore)
        .accessibilityLabel(
            "Estimated score \(score), range \(scoreRange.lowerBound) to \(scoreRange.upperBound). "
                + "Daily progress: overall \(percent(overall)), Math \(percent(math)), Reading and Writing \(percent(readingWriting))."
        )
        .accessibilityIdentifier("saturnpath.home.rings")
        .animation(SaturnPathMotion.standard(reduceMotion: reduceMotion), value: overall)
        .animation(SaturnPathMotion.standard(reduceMotion: reduceMotion), value: math)
        .animation(SaturnPathMotion.standard(reduceMotion: reduceMotion), value: readingWriting)
    }

    private func ring(progress: Double, color: Color, width: CGFloat) -> some View {
        ZStack {
            Circle()
                .stroke(SaturnPathTheme.line, lineWidth: width)

            Circle()
                .trim(from: 0, to: clamped(progress))
                .stroke(color, style: StrokeStyle(lineWidth: width, lineCap: .round))
                .rotationEffect(.degrees(-90))
                .shadow(color: color.opacity(0.18), radius: 5, y: 3)
        }
    }

    private func legend(label: String, value: Double, color: Color) -> some View {
        HStack(spacing: SaturnPathSpacing.xSmall) {
            Circle()
                .fill(color)
                .frame(width: 8, height: 8)
            Text("\(label) \(percent(value))")
                .font(SaturnPathTypography.caption)
                .foregroundStyle(SaturnPathTheme.mutedInk)
        }
    }

    private func clamped(_ value: Double) -> Double {
        min(max(value, 0), 1)
    }

    private func percent(_ value: Double) -> String {
        clamped(value).formatted(.percent.precision(.fractionLength(0)))
    }
}

struct SaturnPathPrimaryButtonStyle: ButtonStyle {
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(SaturnPathTypography.bodyStrong)
            .foregroundStyle(.white)
            .frame(maxWidth: .infinity, minHeight: 56)
            .padding(.horizontal, SaturnPathSpacing.medium)
            .background(
                LinearGradient(
                    colors: [Color(red: 0.541, green: 0.486, blue: 1), SaturnPathTheme.primaryDeep],
                    startPoint: .topLeading,
                    endPoint: .bottomTrailing
                ),
                in: RoundedRectangle(cornerRadius: 18, style: .continuous)
            )
            .shadow(
                color: SaturnPathTheme.primary.opacity(configuration.isPressed ? 0.16 : 0.30),
                radius: configuration.isPressed ? 6 : 13,
                y: configuration.isPressed ? 3 : 8
            )
            .opacity(configuration.isPressed ? 0.92 : 1)
            .offset(y: configuration.isPressed ? 1 : 0)
            .animation(
                reduceMotion ? nil : .easeOut(duration: 0.18),
                value: configuration.isPressed
            )
    }
}

private struct SaturnPathGlassCardModifier: ViewModifier {
    let padding: CGFloat
    let radius: CGFloat

    func body(content: Content) -> some View {
        content
            .padding(padding)
            .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: radius, style: .continuous))
            .background(
                SaturnPathTheme.surface,
                in: RoundedRectangle(cornerRadius: radius, style: .continuous)
            )
            .overlay {
                RoundedRectangle(cornerRadius: radius, style: .continuous)
                    .stroke(Color.white.opacity(0.88), lineWidth: 1)
            }
            .shadow(color: SaturnPathTheme.shadow.opacity(0.55), radius: 17, y: 9)
    }
}

extension View {
    func spGlassCard(
        padding: CGFloat = SaturnPathSpacing.medium,
        radius: CGFloat = SaturnPathRadius.card
    ) -> some View {
        modifier(SaturnPathGlassCardModifier(padding: padding, radius: radius))
    }
}
