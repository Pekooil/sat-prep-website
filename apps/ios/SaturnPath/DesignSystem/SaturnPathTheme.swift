import SwiftUI

enum SaturnPathTheme {
    static let canvas = Color(red: 0.961, green: 0.969, blue: 1.000)
    static let canvasDeep = Color(red: 0.929, green: 0.941, blue: 1.000)
    static let primary = Color(red: 0.408, green: 0.341, blue: 0.965)
    static let mint = Color(red: 0.208, green: 0.812, blue: 0.643)
    static let coral = Color(red: 1.000, green: 0.478, blue: 0.439)
    static let sky = Color(red: 0.439, green: 0.725, blue: 1.000)
    static let ink = Color(red: 0.090, green: 0.196, blue: 0.302)
    static let mutedInk = Color(red: 0.376, green: 0.459, blue: 0.541)
    static let softInk = Color(red: 0.467, green: 0.537, blue: 0.604)
    static let shadow = Color(red: 0.271, green: 0.259, blue: 0.541).opacity(0.16)

    static let canvasGradient = LinearGradient(
        colors: [Color.white, canvas, canvasDeep],
        startPoint: .topLeading,
        endPoint: .bottomTrailing
    )
}

enum SaturnPathEnvironment: String, Equatable, Sendable {
    case development
    case staging
    case production

    static var current: Self {
        #if STAGING
        .staging
        #elseif PRODUCTION
        .production
        #else
        .development
        #endif
    }

    var label: String {
        switch self {
        case .development:
            "Development shell"
        case .staging:
            "Staging shell"
        case .production:
            "Production shell"
        }
    }
}
