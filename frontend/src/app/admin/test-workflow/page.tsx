'use client';

import React, { useState, useEffect } from 'react';
import { 
  PlayIcon, 
  ClockIcon, 
  UsersIcon, 
  CheckCircleIcon,
  XCircleIcon,
  CogIcon
} from '@heroicons/react/24/outline';

interface TestDestination {
  id: number;
  name: string;
  country: string;
}

interface TestInterest {
  id: number;
  user_name: string;
  user_email: string;
  destination_name: string;
  date_from: string;
  date_to: string;
  num_people: number;
  status: string;
}

interface TestGroup {
  id: number;
  name: string;
  destination_name: string;
  status: string;
  confirmed_members: number;
  total_members: number;
  confirmation_deadline: string;
}

export default function GroupFormationTestPage() {
  const [destinations, setDestinations] = useState<TestDestination[]>([]);
  const [interests, setInterests] = useState<TestInterest[]>([]);
  const [groups, setGroups] = useState<TestGroup[]>([]);
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);

  useEffect(() => {
    fetchTestData();
  }, []);

  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, `[${timestamp}] ${message}`]);
  };

  const fetchTestData = async () => {
    try {
      const [destResponse, interestResponse, groupResponse] = await Promise.all([
        fetch(`${API_BASE_URL}/api/v1/destinations`),
        fetch(`${API_BASE_URL}/api/v1/test/debug-interests`),
        fetch(`${API_BASE_URL}/api/v1/test/check-groups`)
      ]);

      if (destResponse.ok) {
        const destData = await destResponse.json();
        setDestinations(destData.destinations || []);
      }

      if (interestResponse.ok) {
        const interestData = await interestResponse.json();
        setInterests(interestData.interests || []);
      }

      if (groupResponse.ok) {
        const groupData = await groupResponse.json();
        setGroups(groupData.groups || []);
      }
    } catch (error) {
      addLog(`Error fetching data: ${error}`);
    }
  };

  const generateTestInterests = async () => {
    setLoading(true);
    addLog('Starting test interest generation...');

    try {
      // Generate 8-10 similar interests for Goa
      const testInterests = [
        {
          user_name: 'Alice Johnson',
          user_email: 'alice@example.com',
          destination_id: 1, // Assuming Goa is destination 1
          date_from: '2025-12-15',
          date_to: '2025-12-20',
          num_people: 2,
          budget_min: 35000,
          budget_max: 45000
        },
        {
          user_name: 'Bob Smith',
          user_email: 'bob@example.com',
          destination_id: 1,
          date_from: '2025-12-16',
          date_to: '2025-12-21',
          num_people: 2,
          budget_min: 38000,
          budget_max: 48000
        },
        {
          user_name: 'Carol Davis',
          user_email: 'carol@example.com',
          destination_id: 1,
          date_from: '2025-12-14',
          date_to: '2025-12-19',
          num_people: 3,
          budget_min: 36000,
          budget_max: 46000
        },
        {
          user_name: 'David Wilson',
          user_email: 'david@example.com',
          destination_id: 1,
          date_from: '2025-12-17',
          date_to: '2025-12-22',
          num_people: 2,
          budget_min: 37000,
          budget_max: 47000
        },
        {
          user_name: 'Emma Brown',
          user_email: 'emma@example.com',
          destination_id: 1,
          date_from: '2025-12-15',
          date_to: '2025-12-20',
          num_people: 1,
          budget_min: 40000,
          budget_max: 50000
        },
        {
          user_name: 'Frank Miller',
          user_email: 'frank@example.com',
          destination_id: 1,
          date_from: '2025-12-16',
          date_to: '2025-12-21',
          num_people: 4,
          budget_min: 35000,
          budget_max: 45000
        }
      ];

      // Use the backend test endpoint to generate sample interests
      const response = await fetch(`${API_BASE_URL}/api/v1/test/generate-sample-interests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      if (response.ok) {
        const result = await response.json();
        addLog(`✅ Generated sample interests: ${result.message}`);
        addLog(`📊 Created interests for: ${result.interests?.join(', ') || 'sample users'}`);
        await fetchTestData(); // Refresh the data
      } else {
        const error = await response.text();
        addLog(`❌ Failed to generate sample interests: ${error}`);
      }

      addLog('Test interests generation completed!');
      await fetchTestData();

    } catch (error) {
      addLog(`Error generating test interests: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const triggerClustering = async () => {
    setLoading(true);
    addLog('Triggering interest clustering...');

    try {
      const response = await fetch('/api/clustering/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ force: true })
      });

      if (response.ok) {
        const result = await response.json();
        addLog(`✅ Clustering triggered successfully: ${result.clusters_created} groups created`);
        
        // Wait a bit and refresh data
        setTimeout(async () => {
          await fetchTestData();
          addLog('Data refreshed - check groups section');
        }, 2000);
      } else {
        addLog(`❌ Clustering failed: ${response.statusText}`);
      }
    } catch (error) {
      addLog(`Error triggering clustering: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const sendTestConfirmations = async (groupId: number) => {
    setLoading(true);
    addLog(`Sending confirmation notifications for group ${groupId}...`);

    try {
      const response = await fetch(`/api/groups/${groupId}/send-confirmations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      if (response.ok) {
        const result = await response.json();
        addLog(`✅ Sent ${result.notifications_sent} confirmation emails`);
        addLog('Check the logs for confirmation URLs (in development mode)');
      } else {
        addLog(`❌ Failed to send confirmations: ${response.statusText}`);
      }
    } catch (error) {
      addLog(`Error sending confirmations: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const simulateConfirmation = async (groupId: number, confirm: boolean) => {
    setLoading(true);
    const action = confirm ? 'confirming' : 'declining';
    addLog(`Simulating ${action} for group ${groupId}...`);

    try {
      const response = await fetch(`/api/groups/${groupId}/simulate-confirmation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          confirmed: confirm,
          simulate_payment: confirm 
        })
      });

      if (response.ok) {
        const result = await response.json();
        addLog(`✅ Simulated ${action}: ${result.message}`);
        await fetchTestData();
      } else {
        addLog(`❌ Failed to simulate ${action}: ${response.statusText}`);
      }
    } catch (error) {
      addLog(`Error simulating ${action}: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const clearTestData = async () => {
    setLoading(true);
    addLog('Clearing test data...');

    try {
      const response = await fetch('/api/test/clear-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      if (response.ok) {
        addLog('✅ Test data cleared successfully');
        await fetchTestData();
        setLogs([]);
      } else {
        addLog(`❌ Failed to clear test data: ${response.statusText}`);
      }
    } catch (error) {
      addLog(`Error clearing test data: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Group Formation Testing Dashboard
          </h1>
          <p className="text-gray-600">
            Test the complete interest clustering and group formation workflow
          </p>
        </div>

        {/* Control Panel */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
            <CogIcon className="h-6 w-6 mr-2" />
            Test Controls
          </h2>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            <button
              onClick={generateTestInterests}
              disabled={loading}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center"
            >
              <PlayIcon className="h-4 w-4 mr-2" />
              Generate Test Interests
            </button>

            <button
              onClick={triggerClustering}
              disabled={loading}
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center justify-center"
            >
              <UsersIcon className="h-4 w-4 mr-2" />
              Trigger Clustering
            </button>

            <button
              onClick={fetchTestData}
              disabled={loading}
              className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 disabled:opacity-50"
            >
              Refresh Data
            </button>

            <button
              onClick={clearTestData}
              disabled={loading}
              className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 disabled:opacity-50"
            >
              Clear Test Data
            </button>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-8 mb-8">
          {/* Current Interests */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">
              Open Interests ({interests.filter(i => i.status === 'open').length})
            </h3>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {interests
                .filter(i => i.status === 'open')
                .map(interest => (
                  <div key={interest.id} className="bg-gray-50 p-3 rounded-lg">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium">{interest.user_name}</p>
                        <p className="text-sm text-gray-600">{interest.destination_name}</p>
                        <p className="text-sm text-gray-500">
                          {interest.date_from} to {interest.date_to} • {interest.num_people} people
                        </p>
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        interest.status === 'open' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {interest.status}
                      </span>
                    </div>
                  </div>
                ))}
            </div>
          </div>

          {/* Current Groups */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">
              Active Groups ({groups.length})
            </h3>
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {groups.map(group => (
                <div key={group.id} className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="font-medium">{group.name}</p>
                      <p className="text-sm text-gray-600">{group.destination_name}</p>
                      <p className="text-sm text-gray-500">
                        {group.confirmed_members}/{group.total_members} confirmed
                      </p>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      group.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                      group.status === 'pending_confirmation' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {group.status}
                    </span>
                  </div>
                  
                  {group.status === 'pending_confirmation' && (
                    <div className="flex space-x-2 mt-3">
                      <button
                        onClick={() => sendTestConfirmations(group.id)}
                        disabled={loading}
                        className="text-xs bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600 disabled:opacity-50"
                      >
                        Send Confirmations
                      </button>
                      <button
                        onClick={() => simulateConfirmation(group.id, true)}
                        disabled={loading}
                        className="text-xs bg-green-500 text-white px-2 py-1 rounded hover:bg-green-600 disabled:opacity-50"
                      >
                        Simulate Confirm
                      </button>
                      <button
                        onClick={() => simulateConfirmation(group.id, false)}
                        disabled={loading}
                        className="text-xs bg-red-500 text-white px-2 py-1 rounded hover:bg-red-600 disabled:opacity-50"
                      >
                        Simulate Decline
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Logs */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
            <ClockIcon className="h-5 w-5 mr-2" />
            Test Logs
          </h3>
          <div className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-sm max-h-64 overflow-y-auto">
            {logs.length === 0 ? (
              <p className="text-gray-500">No logs yet. Start testing!</p>
            ) : (
              logs.map((log, index) => (
                <div key={index} className="mb-1">
                  {log}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Testing Guide */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mt-8">
          <h3 className="text-lg font-bold text-blue-900 mb-4">📋 Testing Guide</h3>
          <ol className="list-decimal list-inside space-y-2 text-blue-800">
            <li><strong>Generate Test Interests:</strong> Creates 6 similar interests for Goa with overlapping dates</li>
            <li><strong>Trigger Clustering:</strong> Runs the ML clustering algorithm to group similar interests</li>
            <li><strong>Send Confirmations:</strong> Sends email notifications to group members (check logs for URLs)</li>
            <li><strong>Simulate Responses:</strong> Quickly test confirmation/decline without email flow</li>
            <li><strong>Check Confirmation Page:</strong> Copy confirmation URLs from logs to test UI</li>
            <li><strong>Monitor Group Status:</strong> Watch groups transition from pending → confirmed/cancelled</li>
          </ol>
        </div>
      </div>
    </div>
  );
}