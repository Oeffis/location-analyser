Feature: Nearby Platforms Detection
    In order to be able to see nearby transit options without manually entering the station
    As a commuter
    I want to be able to detect nearby platforms

    Background:
        Given I use a location analyzer with the VRR data

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
            | de:05513:5613:91:6   |
            | de:05513:5613:91:7   |
            | de:05513:5613:98:8   |
            | de:05513:5613:98:25  |
            | de:05513:6687:0:02   |
            | de:05513:6687:0:01   |
            | de:05513:6694:0:02   |
            | de:05513:6694:0:01   |
            | de:05513:5204:0:01   |
            | de:05513:5646:0:01   |
            | de:05513:5204:0:02   |
            | de:05513:5646:0:02   |
            | de:05513:6684:0:02   |
            | de:05513:6684:0:01   |
            | de:05513:5615:0:02   |
            | de:05513:5615:0:01   |
            | de:05513:5034:1:01   |

    Scenario: No stops added
        Given I do not configure any stops initially
        But I am at 'GE Westfälische Hochschule'
        Then no nearby platforms are detected

    Scenario: Stops are added later
        Given I do not configure any stops initially
        But I add the VRR stops
        And I am at 'GE Westfälische Hochschule'
        Then the id of the nearest platform is 'de:05513:6762:0:01'

    Scenario: Updates status when the position changes
        Given I am 10.0 m west of 'GE Westfälische Hochschule'
        Then the distance to the nearest platform is 10.0m
        When I am at 'GE Westfälische Hochschule'
        Then the distance to the nearest platform is 0.0m
