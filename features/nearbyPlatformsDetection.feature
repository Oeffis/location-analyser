Feature: Nearby Platforms Detection
    In order to be able to see nearby transit options without manually entering the station
    As a commuter
    I want to be able to detect nearby platforms

    Scenario: Detects the platform when at exactly the right coordinates
        Given I am at 'GE Westfälische Hochschule'
        Then the id of the nearest platform is 'de:05513:6762:0:01'

    Scenario: Detects no platforms when no location was set
        Given No location was set
        Then no nearby platforms are detected

    @ignore
    Scenario: Detects multiple nearby platforms
        Given I am near multiple platforms
        When I check for my current status
        Then the current platform is detected
        And nearby platforms are detected

    @ignore
    Scenario: Detects no platform
        Given I am on a platform
        When I check for my current status
        Then no nearby platforms are detected
