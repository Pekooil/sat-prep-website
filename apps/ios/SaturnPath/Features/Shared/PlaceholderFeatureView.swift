import SwiftUI

struct PlaceholderFeatureView: View {
    let eyebrow: String
    let title: String
    let message: String
    let systemImage: String
    let accessibilityIdentifier: String
    let onOpenProfile: () -> Void

    var body: some View {
        NavigationStack {
            ZStack {
                SaturnPathBackground()

                VStack(spacing: 0) {
                    SaturnPathAppHeader(
                        profileLabel: "DW",
                        onProfileSelected: onOpenProfile
                    )

                    ScrollView {
                        VStack(alignment: .leading, spacing: SaturnPathSpacing.large) {
                            VStack(alignment: .leading, spacing: SaturnPathSpacing.xSmall) {
                                Text(eyebrow)
                                    .font(SaturnPathTypography.eyebrow)
                                    .tracking(1.1)
                                    .textCase(.uppercase)
                                    .foregroundStyle(SaturnPathTheme.primaryDeep)

                                Text(title)
                                    .font(SaturnPathTypography.pageTitle)
                                    .foregroundStyle(SaturnPathTheme.ink)
                                    .accessibilityAddTraits(.isHeader)
                                    .accessibilityIdentifier(accessibilityIdentifier)

                                Text(message)
                                    .font(SaturnPathTypography.body)
                                    .foregroundStyle(SaturnPathTheme.mutedInk)
                            }

                            VStack(spacing: SaturnPathSpacing.medium) {
                                Image(systemName: systemImage)
                                    .font(.system(size: 38, weight: .semibold))
                                    .foregroundStyle(SaturnPathTheme.primary)
                                    .frame(width: 76, height: 76)
                                    .background(
                                        SaturnPathTheme.primarySoft,
                                        in: RoundedRectangle(cornerRadius: SaturnPathRadius.card, style: .continuous)
                                    )
                                    .accessibilityHidden(true)

                                Text("Native foundation ready")
                                    .font(SaturnPathTypography.sectionTitle)
                                    .foregroundStyle(SaturnPathTheme.ink)

                                Text("This area is connected to the shared tab shell and ready for its server-owned data milestone.")
                                    .font(SaturnPathTypography.body)
                                    .foregroundStyle(SaturnPathTheme.mutedInk)
                                    .multilineTextAlignment(.center)
                            }
                            .frame(maxWidth: .infinity)
                            .spGlassCard(padding: SaturnPathSpacing.xLarge, radius: SaturnPathRadius.hero)
                        }
                        .padding(.horizontal, SaturnPathSpacing.large)
                        .padding(.top, SaturnPathSpacing.small)
                        .padding(.bottom, SaturnPathSpacing.xxLarge)
                    }
                    .scrollIndicators(.hidden)
                }
            }
            .toolbar(.hidden, for: .navigationBar)
        }
    }
}
