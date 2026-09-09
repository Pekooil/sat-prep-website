import SwiftUI

enum SaturnPathTheme {
    static let canvas = Color(red: 0.961, green: 0.969, blue: 1.000)
    static let canvasDeep = Color(red: 0.929, green: 0.941, blue: 1.000)
    static let surface = Color.white.opacity(0.78)
    static let surfaceStrong = Color.white.opacity(0.92)
    static let surfaceSolid = Color.white
    static let primary = Color(red: 0.408, green: 0.341, blue: 0.965)
    static let primaryDeep = Color(red: 0.337, green: 0.263, blue: 0.918)
    static let primarySoft = Color(red: 0.914, green: 0.902, blue: 1.000)
    static let mint = Color(red: 0.208, green: 0.812, blue: 0.643)
    static let mintDeep = Color(red: 0.075, green: 0.475, blue: 0.357)
    static let mintSoft = Color(red: 0.855, green: 0.973, blue: 0.933)
    static let coral = Color(red: 1.000, green: 0.478, blue: 0.439)
    static let coralDeep = Color(red: 0.710, green: 0.173, blue: 0.157)
    static let coralSoft = Color(red: 1.000, green: 0.906, blue: 0.894)
    static let sky = Color(red: 0.439, green: 0.725, blue: 1.000)
    static let skySoft = Color(red: 0.878, green: 0.941, blue: 1.000)
    static let ink = Color(red: 0.090, green: 0.196, blue: 0.302)
    static let mutedInk = Color(red: 0.376, green: 0.459, blue: 0.541)
    static let softInk = Color(red: 0.467, green: 0.537, blue: 0.604)
    static let line = Color(red: 0.325, green: 0.388, blue: 0.522).opacity(0.14)
    static let lineStrong = Color(red: 0.325, green: 0.388, blue: 0.522).opacity(0.26)
    static let shadow = Color(red: 0.271, green: 0.259, blue: 0.541).opacity(0.16)

    static let canvasGradient = LinearGradient(
        colors: [Color.white, canvas, canvasDeep],
        startPoint: .topLeading,
        endPoint: .bottomTrailing
    )
}
