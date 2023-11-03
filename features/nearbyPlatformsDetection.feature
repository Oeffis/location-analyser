Feature: Nearby Platforms Detection
    In order to be able to see nearby transit options without manually entering the station
    As a commuter
    I want to be able to detect nearby platforms

    Scenario: Detects the current platform
        Given I am on a platform
        When I check for my current status
        Then the current platform is detected

    Scenario: Detects multiple nearby platforms
        Given I am near multiple platforms
        When I check for my current status
        Then the current platform is detected
        And nearby platforms are detected

    Scenario: Detects no platform
        Given I am on a platform
        When I check for my current status
        Then no nearby platforms are detected
