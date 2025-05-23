#!/bin/bash

# Set environment variables
export BASE_URL=${BASE_URL:-"http://localhost:4000"}

# Function to run a specific scenario
run_scenario() {
    local scenario=$1
    echo "Running $scenario test..."
    k6 run --tag testType=$scenario -e SCENARIO=$scenario scenarios.js
}

# Check if a specific scenario was requested
if [ $# -eq 1 ]; then
    case $1 in
        "smoke"|"load"|"stress"|"spike")
            run_scenario $1
            ;;
        *)
            echo "Invalid scenario. Available scenarios: smoke, load, stress, spike"
            exit 1
            ;;
    esac
else
    # Run all scenarios in sequence
    echo "Running all test scenarios..."
    
    echo "1. Running smoke test..."
    k6 run --tag testType=smoke scenarios.js

    echo "2. Running load test..."
    k6 run --tag testType=load scenarios.js

    echo "3. Running stress test..."
    k6 run --tag testType=stress scenarios.js

    echo "4. Running spike test..."
    k6 run --tag testType=spike scenarios.js
fi 