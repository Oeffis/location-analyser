Feature: Nearby Platforms Detection
    In order to be able to see nearby transit options without manually entering the station
    As a commuter
    I want to be able to detect nearby platforms

    Background:
        Given I use a location analyzer with the VRR data

    Scenario: Detects the platform when exactly at the bus stop
        Given I am at 'GE Westfälische Hochschule'
        Then the id of the nearest platform is '379638461'
        And the distance to the nearest platform is 0.0m

    Scenario: Detects that I am on the platform when I am on the platform
        Given I am at 'Platform 7 of Gelsenkirchen Hbf'
        Then the id of the nearest platform is '4250657'
        And the distance to the nearest platform is 0.0m

    Scenario: Detects the platform when I am near the platform
        Given I am 10.0 m west of 'GE Westfälische Hochschule'
        Then the distance to the nearest platform is less than 10.0m
        And the id of the nearest platform is '379638461'

    Scenario: Detects no platforms when no location was set
        Given No location was set
        Then no nearby platforms are detected

    Scenario: Detects multiple nearby platforms
        Given I am at "Platform 7 of Gelsenkirchen Hbf"
        Then the ids of the nearest platforms are:
            | 4250657    |
            | 4250655    |
            | 4250656    |
            | 230302908  |
            | 3826948947 |
            | 3826948945 |
            | 293112817  |
            | 293112824  |
            | 3119213571 |
            | 454116273  |
            | 454116278  |
            | 454116276  |
            | 3835813460 |
            | 3835813457 |
            | 293112785  |
            | 293112790  |
            | 448942759  |
            | 448942760  |
            | 293112656  |

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
