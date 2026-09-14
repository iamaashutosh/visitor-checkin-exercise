require "test_helper"

class Api::VisitorsRegressionTest < ActionDispatch::IntegrationTest
  test "visitor search excludes deactivated visitors" do
    get "/api/visitors/search?q=Sam%20Inactive"

    assert_response :success
    ids = JSON.parse(response.body).map { |visitor| visitor.fetch("id") }

    assert_not_includes ids, visitors(:inactive_visitor).id
  end

  test "active visitor list excludes deactivated visitors even when not checked out" do
    get "/api/visitors?page=1"

    assert_response :success
    ids = JSON.parse(response.body).map { |visitor| visitor.fetch("id") }

    assert_not_includes ids, visitors(:inactive_visitor).id
  end

  test "visitor creation with an invalid host returns a client error" do
    assert_no_difference "Visitor.count" do
      post "/api/visitors",
        params: {
          full_name: "Invalid Host Visitor",
          company_name: "Example Co",
          purpose: "Meeting",
          host_id: 45
        },
        as: :json
    end

    assert_response :unprocessable_entity
    assert_includes JSON.parse(response.body).fetch("errors").to_s, "host"
  end

  test "active visitor list loads hosts without one query per visitor" do
    20.times do |index|
      Visitor.create!(
        full_name: "Performance Visitor #{index}",
        company_name: "Example Co",
        purpose: "Meeting",
        checked_in_at: Time.current,
        host: hosts(:alice)
      )
    end

    queries = []
    subscriber = ActiveSupport::Notifications.subscribe("sql.active_record") do |_name, _started, _finished, _unique_id, payload|
      queries << payload[:sql] unless payload[:name] == "SCHEMA"
    end

    get "/api/visitors?page=1"
  ensure
    ActiveSupport::Notifications.unsubscribe(subscriber) if subscriber

    assert_response :success
    assert_equal 2, queries.count
  end
end