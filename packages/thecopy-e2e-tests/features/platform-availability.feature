Feature: Public platform availability
  The platform should be understandable and useful to a visitor before deeper journeys run.

  Scenario: Visitor can understand the home page
    Given the public frontend is reachable
    When a visitor opens the home page
    Then the page should expose Arabic product content and primary navigation

  Scenario: Visitor can open the analysis studio
    Given the public frontend is reachable
    When a visitor opens the "analysis" studio
    Then the studio should render a meaningful interactive surface
