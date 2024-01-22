Feature: Nearby Platforms Detection
    In order to be able to see nearby transit options without manually entering the station
    As a commuter
    I want to be able to detect nearby platforms

    Background:
        Given I use a location analyzer with the VRR data

    Scenario: Detects the platform when exactly at the platform
        Given I am at 'GE Westfälische Hochschule'
        Then the id of the nearest platform is '379638461'
        And the distance to the nearest platform is 0.0m

    Scenario: Detects the platform when I am near the platform
        Given I am 10.0 m west of 'GE Westfälische Hochschule'
        Then the distance to the nearest platform is less than 10.0m
        And the id of the nearest platform is '379638461'

    Scenario: Detects no platforms when no location was set
        Given No location was set
        Then no nearby platforms are detected

    Scenario: Detects multiple nearby platforms
        Given I am at "Gelsenkirchen Hbf"
        Then the ids of the nearest platforms are:
            | 230302908  |
            | 4250656    |
            | 4250657    |
            | 4250655    |
            | 293112656  |
            | 293112785  |
            | 293112790  |
            | 293112817  |
            | 293112824  |
            | 448942759  |
            | 448942760  |
            | 454116273  |
            | 454116276  |
            | 454116278  |
            | 3119213571 |
            | 3826948945 |
            | 3826948947 |
            | 3835813457 |
            | 3835813460 |

    Scenario: No stops added
        Given I do not configure any stops initially
        But I am at 'GE Westfälische Hochschule'
        Then no nearby platforms are detected

    Scenario: Stops are added later
        Given I do not configure any stops initially
        But I add the VRR stops
        And I am at 'GE Westfälische Hochschule'
        Then the id of the nearest platform is '379638461'

    Scenario: Updates status when the position changes
        Given I am 10.0 m west of 'GE Westfälische Hochschule'
        Then the distance to the nearest platform is less than 10.0m
        When I am at 'GE Westfälische Hochschule'
        Then the distance to the nearest platform is 0.0m
