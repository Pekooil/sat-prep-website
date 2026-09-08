import SwiftUI

enum SaturnPathSpacing {
    static let xSmall: CGFloat = 6
    static let small: CGFloat = 10
    static let medium: CGFloat = 14
    static let large: CGFloat = 20
    static let xLarge: CGFloat = 24
    static let xxLarge: CGFloat = 32
}

enum SaturnPathRadius {
    static let control: CGFloat = 16
    static let card: CGFloat = 22
    static let hero: CGFloat = 30
    static let pill: CGFloat = 999
}

enum SaturnPathLayout {
    /// Keeps the final scrollable control comfortably above the floating system tab bar.
    static let tabBarContentClearance: CGFloat = 104
}

enum SaturnPathTypography {
    static let eyebrow = Font.system(.caption2, design: .rounded, weight: .bold)
    static let pageTitle = Font.system(.title2, design: .rounded, weight: .bold)
    static let sectionTitle = Font.system(.headline, design: .rounded, weight: .bold)
    static let body = Font.system(.body, design: .rounded, weight: .regular)
    static let bodyStrong = Font.system(.body, design: .rounded, weight: .semibold)
    static let metric = Font.system(.title3, design: .rounded, weight: .bold)
    static let score = Font.system(.largeTitle, design: .rounded, weight: .bold)
    static let caption = Font.system(.caption, design: .rounded, weight: .semibold)
}

enum SaturnPathMotion {
    static func standard(reduceMotion: Bool) -> Animation? {
        reduceMotion ? nil : .easeOut(duration: 0.28)
    }
}
