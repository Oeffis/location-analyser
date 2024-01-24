Feature: Onboard Train Detection
    In order to be able to see information about the train I am currently on
    As a commuter
    I want to be able to detect the train I am currently on

    Scenario: Detect the train I am currently on when each direction travels a separate track
        Given the 302 travels on a separate track in each direction north of Veltins Arena
        When I am on the 302 to Buer Rathaus North of Veltins Arena
        Then the detected train is the "302" to "Gelsenkirchen Buer Rathaus"

    Scenario: Detect the train I am currently on both directions travel on the same track
        Given the RB43 travels on a single track between Buer Süd and Zoo
        When I am on the RB43 between Buer Süd and Zoo
        And I am traveling in the direction of Zoo
        Then the detected train is the "RB 43" to "Dortmund"
        And the train "RB 43" to "Dorsten" is not detected

    Scenario: Does not detect train when I am on airline between consecutive sections
        Given the S9 to Wuppertal leaves the area between Gladback and Essen
        When I move along the area edge between Gladback and Essen
        Then the train "S9" to "Wuppertal Hbf" is not detected

    Scenario: Detects the train I am currently on when I am on the track section that enters the area again
        Given the S9 to Wuppertal leaves the area between Gladback and Essen
        When I am on the S9 to Wuppertal between Essen and Wuppertal
        Then the detected train is the "S9" to "Wuppertal Hbf"

    Scenario: Detects the train I am currently on when it is at a station
        Given the RE2 stops at platform 7 of Gelsenkirchen Hbf
        When I am on the RE2 at platform 7 of Gelsenkirchen Hbf
        Then one of the detected trains is the "RE2" to "Osnabrück"

    Scenario: Detects the platform I am at when I am next to a train on a platform
        Given the RE2 stops at platform 7 of Gelsenkirchen Hbf
        When I am on "Platform 7 of Gelsenkirchen Hbf"
        Then the detected platform is "Platform 7 of Gelsenkirchen Hbf"

    Scenario: Detects the actual vehicle I'm on, when the alterantives are gone
        Given the Lines 399 and 342 split at the start of the Neidenburger Straße
        And I traveled from the Westfälische Hochschule to the Neidenburger Straße
        When I travel further along the route of the 399
        Then the detected train is the "399" to "Gelsenkirchen Buer Rathaus"

    @ignore
    Scenario: Detects I am on a train when location glitched
        When my previous location was nowhere near
        And I am on a train
        Then the train I am on is detected

    @ignore
    Scenario: Detects no train when I am not on a train
        When I am not on a train
        Then no train is detected

    @ignore
    Scenario: Detects I have left the train when I did
        When I was on a train
        And I left the train
        Then no train is detected
