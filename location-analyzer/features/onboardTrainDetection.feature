Feature: Onboard Train Detection
    In order to be able to see information about the train I am currently on
    As a commuter
    I want to be able to detect the train I am currently on

    Scenario: Detect the train I am currently on when each direction travels a separate track
        Given the 302 travels on a separate track in each direction north of Veltins Arena
        When I am on the 302 to Buer Rathaus North of Veltins Arena
        Then the detected train is the "302" to "Gelsenkirchen Buer Rathaus"

    @focus
    Scenario: Detect the train I am currently on both directions travel on the same track
        Given the RB43 travels on a single track between Dingden and Bocholt
        When I am on the RB43 between Buer Süd and Zoo
        And I am traveling in the direction of Zoo
        Then the detected train is the "RB 43" to "Dortmund"
        And the train "RB 43" to "Dorsten" is not detected

    @ignore
    Scenario: Detects the train I am currently on when it is at a station
        When I am on a train at a station
        Then the train I am on is detected

    @ignore
    Scenario: Detects the platform I am at when I am next to a train on a platform
        When I am on a train at a station
        Then the train I am on is detected

    @ignore
    Scenario: Detects the train I am currently on when another train is passing
        When I am on a train
        And another train is passing in the opposite direction
        Then the train I am on is detected

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
