Feature: Nearby Platforms Detection
    In order to be able to see nearby transit options without manually entering the station
    As a commuter
    I want to be able to detect nearby platforms

    Scenario: Detects the platform when exactly at the platform
        Given I am at 'GE Westfälische Hochschule'
        Then the id of the nearest platform is 'de:05513:6762:0:01'
        And the distance to the nearest platform is 0.0m

    Scenario: Detects the platform when I am near the platform
        Given I am 10.0 m west of 'GE Westfälische Hochschule'
        Then the distance to the nearest platform is 10.0m
        And the id of the nearest platform is 'de:05513:6762:0:01'

    Scenario: Detects no platforms when no location was set
        Given No location was set
        Then no nearby platforms are detected

    Scenario: Detects multiple nearby platforms
        Given I am at "Gelsenkirchen Hbf"
        Then the ids of the nearest platforms are:
            | de:05513:5613_Parent |
            | de:05513:5613:2:10   |
            | de:05513:5613:2:11   |
            | de:05513:5613:90:5   |
            | de:05513:5613:90:4   |
            | de:05513:5613:91:6   |
            | de:05513:5613:91:7   |
            | de:05513:5613:98:8   |
            | de:05513:5613:98:25  |
            | de:05513:5613:1:01   |
            | de:05513:5613:1:04   |
            | de:05513:5613:1:07   |
            | de:05513:5613:1:10   |
            | de:05513:5613:1:05   |
            | de:05513:5613:1:02   |
            | de:05513:5613:1:08   |
            | de:05513:5613:1:11   |
            | de:05513:5613:1:06   |
            | de:05513:5613:1:03   |
            | de:05513:5613:1:09   |

    Scenario: No stops added
        Given I do not configure any stops initially
        But I am at 'GE Westfälische Hochschule'
        Then no nearby platforms are detected
