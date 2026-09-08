import SwiftUI

@main
struct SaturnPathApp: App {
    private let dependencies = AppDependencies.makeDefault()

    var body: some Scene {
        WindowGroup {
            AppShellView()
                .environment(\.appDependencies, dependencies)
                .preferredColorScheme(.light)
        }
    }
}
