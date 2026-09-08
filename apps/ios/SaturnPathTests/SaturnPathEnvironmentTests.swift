import Foundation
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

    @Test
    func processEnvironmentCanOverrideTheAPIBaseURL() throws {
        let configuration = AppConfiguration.current(
            processEnvironment: [
                AppConfiguration.apiBaseURLInfoKey: "https://staging.example.test/api/v2",
            ]
        )

        #expect(
            configuration.apiBaseURL
                == URL(string: "https://staging.example.test/api/v2")
        )
    }
}
