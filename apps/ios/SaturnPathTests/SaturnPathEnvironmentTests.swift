import Testing
@testable import SaturnPath

struct SaturnPathEnvironmentTests {
    @Test
    func debugBuildUsesDevelopmentEnvironment() {
        #if DEBUG
        #expect(SaturnPathEnvironment.current == .development)
        #endif
    }

    @Test
    func everyEnvironmentHasAReadableLabel() {
        for environment in [
            SaturnPathEnvironment.development,
            SaturnPathEnvironment.staging,
            SaturnPathEnvironment.production,
        ] {
            #expect(!environment.label.isEmpty)
        }
    }
}
