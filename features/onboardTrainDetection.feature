Feature: Onboard Train Detection
    In order to be able to see information about the train I am currently on
    As a commuter
    I want to be able to detect the train I am currently on

    Scenario: Detect the train I am currently on
        Given I am on a train
        When I check for my current status
        Then the train I am on is detected

    Scenario: Detects the train I am currently on when it is at a station
        Given I am on a train at a station
        When I check for my current status
        Then the train I am on is detected

    Scenario: Detects the platform I am at when I am next to a train on a platform
        Given I am on a train at a station
        When I check for my current status
        Then the train I am on is detected

    Scenario: Detects the train I am currently on when another train is passing
        Given I am on a train
        And another train is passing in the opposite direction
        When I check for my current status
        Then the train I am on is detected

    Scenario: Detects I am on a train when location glitched
        Given my previous location was nowhere near
        And I am on a train
        When I check for my current status
        Then the train I am on is detected

    Scenario: Detects no train when I am not on a train
        Given I am not on a train
        When I check for my current status
        Then no train is detected

    Scenario: Detects I have left the train when I did
        Given I was on a train
        And I left the train
        When I check for my current status
        Then no train is detected
