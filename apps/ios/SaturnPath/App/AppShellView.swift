import SwiftUI

struct AppShellView: View {
    var body: some View {
        AppFlowView()
    }
}

#Preview("App shell") {
    AppShellView()
        .environment(\.appDependencies, .preview)
}
