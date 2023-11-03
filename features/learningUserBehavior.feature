Feature: Learning User Behavior
    In order to have my actions predicted
    As a commuter
    I want my behavior to be learned

    Scenario: Predicting the exit station
        Given I frequently exit at a specific station
        And I am on a train that includes that station
        When I check for predictions
        Then the station is predicted as my exit station

    Scenario: Predicting the final destination
        Given I frequently travel to a location
        And I am on a train traveling in the direction of the location
        When I check for predictions
        Then the location is predicted as my final destination

    Scenario: Predicting a future trip
        Given I travel to a location at regular intervals
        And an interval is upcoming
        When I check for predictions
        Then the location is predicted as my final destination
