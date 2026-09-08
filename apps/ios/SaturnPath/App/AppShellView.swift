import SwiftUI

struct AppShellView: View {
    var body: some View {
        MainTabView()
    }
}

#Preview("App shell") {
    AppShellView()
        .environment(\.appDependencies, .preview)
}
