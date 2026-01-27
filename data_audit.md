# CloudTrucks API Data Audit
**Date:** 2026-01-23
**Status:** Audit Complete

## Overview
A debug scan was performed to capture the full payload returned by the CloudTrucks API. The goal was to identify unused data fields that could enhance the Scout application.

## Findings
The API returns a rich set of data that is currently largely untapped.

### Currently Used Fields
- `id`
- `origin_city`, `origin_state`, `origin_address`
- `dest_city`, `dest_state`, `dest_address`
- `trip_rate`
- `trip_distance_mi`
- `equipment`
- `broker_name`
- `origin_pickup_date`
- `dest_delivery_date`
- `instant_book`
- `estimated_rate`, `estimated_rate_min`, `estimated_rate_max`
- `truck_weight_lb`
- `total_deadhead_mi`
- `stops`

### Valuable Unused Fields (Recommended for Implementation)
The following fields were identified as potentially high-value for users:

1.  **Financials & Bidding**
    *   `estimated_fuel_cost`: Estimated cost of fuel for the trip.
    *   `estimated_toll_cost`: Estimated toll costs.
    *   `estimated_revenue_per_hour`: Revenue efficiency metric.
    *   `has_auto_bid`: Boolean indicating if auto-bidding is available.

2.  **Load Details**
    *   `age_min`: The age of the load in minutes. **Critical for "freshness" indicator.**
    *   `truck_length_ft`: Required truck length.
    *   `is_team_load`: Boolean, important for solo drivers to filter out.
    *   `trip_stops`: Number of stops (we currently use the `stops` array, but this is a quick summary count).
    *   `booking_instructions`: Special instructions for booking.

3.  **Broker & Contact**
    *   `broker_mc_number`: Useful for broker vetting checks.
    *   `contact_email`, `contact_phone`: Direct contact info.
    *   `contact_email_booking`, `contact_phone_booking`: Specific booking contact info.

4.  **Operational**
    *   `origin_deadhead_mi`: Deadhead to pickup.
    *   `dest_deadhead_mi`: Deadhead from delivery.
    *   `trailer_drop_warnings`: Warnings about dropping trailers.

## Recommendation
We should immediately update the `CloudTrucksLoad` interface to include:
- `age_min` (to show "Posted 5 mins ago")
- `is_team_load` (to badge team loads)
- `estimated_fuel_cost` (for net profit calc)
- `broker_mc_number` (for trust)
- `contact_phone` (for quick action)

## Next Steps
1.  Update `CloudTrucksLoad` interface in `src/workers/cloudtrucks-api-client.ts`.
2.  Update `DashboardFeed` load cards to display:
    - "Freshness" (e.g., "5m ago")
    - Team Load badge (if true)
    - Broker MC# tooltip
