'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { createClient } from '@/app/lib/supabase/client';
import { recordManualPayment } from './actions';

type Member = {
  id: string;
  full_name: string;
  email: string;
};

export default function ManualPaymentPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [selectedMember, setSelectedMember] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredMembers, setFilteredMembers] = useState<Member[]>([]);

  // Fetch members on component mount
  useEffect(() => {
    const fetchMembers = async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .eq('role', 'member')
        .order('full_name');

      if (error) {
        console.error('Error fetching members:', error);
        setError('Failed to load members. Please try again.');
      } else {
        setMembers(data || []);
        setFilteredMembers(data || []);
      }
    };

    fetchMembers();
  }, []);

  // Filter members based on search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredMembers(members);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = members.filter(
      member => 
        member.full_name?.toLowerCase().includes(query) || 
        member.email?.toLowerCase().includes(query)
    );
    
    setFilteredMembers(filtered);
  }, [searchQuery, members]);

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const formData = new FormData(e.currentTarget);
      const result = await recordManualPayment(formData);
      
      // If the function returns (doesn't redirect), there was an error
      if (result && !result.success) {
        setError(result.error);
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Record Manual Payment</h1>
          <p className="text-gray-500 mt-1">Record a payment received outside of the online system</p>
        </div>
        <Link
          href="/admin/finance/payments"
          className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
        >
          Back to Payments
        </Link>
      </div>
      
      <div className="bg-white rounded-lg shadow p-6 max-w-2xl mx-auto">
        {error && (
          <div className="mb-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}
        
        <form onSubmit={handleSubmit}>
          {/* Member Selection */}
          <div className="mb-6">
            <label htmlFor="memberSearch" className="block text-sm font-medium text-gray-700 mb-1">
              Search Member
            </label>
            <input
              type="text"
              id="memberSearch"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name or email"
              className="w-full border-gray-300 rounded-md shadow-sm focus:border-primary-500 focus:ring focus:ring-primary-500 focus:ring-opacity-50"
            />
            
            <div className="mt-2">
              <label htmlFor="memberId" className="block text-sm font-medium text-gray-700 mb-1">
                Select Member
              </label>
              <select
                id="memberId"
                name="memberId"
                value={selectedMember}
                onChange={(e) => setSelectedMember(e.target.value)}
                required
                className="w-full border-gray-300 rounded-md shadow-sm focus:border-primary-500 focus:ring focus:ring-primary-500 focus:ring-opacity-50"
              >
                <option value="">Select a member</option>
                {filteredMembers.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.full_name || 'Unnamed'} ({member.email})
                  </option>
                ))}
              </select>
            </div>
          </div>
          
          {/* Payment Details */}
          <div className="mb-6">
            <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-1">
              Amount ($)
            </label>
            <input
              type="number"
              id="amount"
              name="amount"
              min="0.01"
              step="0.01"
              required
              placeholder="0.00"
              className="w-full border-gray-300 rounded-md shadow-sm focus:border-primary-500 focus:ring focus:ring-primary-500 focus:ring-opacity-50"
            />
          </div>
          
          <div className="mb-6">
            <label htmlFor="paymentMethod" className="block text-sm font-medium text-gray-700 mb-1">
              Payment Method
            </label>
            <select
              id="paymentMethod"
              name="paymentMethod"
              required
              className="w-full border-gray-300 rounded-md shadow-sm focus:border-primary-500 focus:ring focus:ring-primary-500 focus:ring-opacity-50"
            >
              <option value="">Select payment method</option>
              <option value="cash">Cash</option>
              <option value="check">Check</option>
              <option value="bank_transfer">Bank Transfer</option>
              <option value="other">Other</option>
            </select>
          </div>
          
          <div className="mb-6">
            <label htmlFor="receiptNumber" className="block text-sm font-medium text-gray-700 mb-1">
              Receipt Number (Optional)
            </label>
            <input
              type="text"
              id="receiptNumber"
              name="receiptNumber"
              placeholder="Enter receipt number if available"
              className="w-full border-gray-300 rounded-md shadow-sm focus:border-primary-500 focus:ring focus:ring-primary-500 focus:ring-opacity-50"
            />
          </div>
          
          <div className="mb-6">
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
              Description (Optional)
            </label>
            <textarea
              id="description"
              name="description"
              rows={3}
              placeholder="Enter payment details or notes"
              className="w-full border-gray-300 rounded-md shadow-sm focus:border-primary-500 focus:ring focus:ring-primary-500 focus:ring-opacity-50"
            ></textarea>
          </div>
          
          {/* Form Actions */}
          <div className="flex justify-end space-x-4">
            <Link
              href="/admin/finance/payments"
              className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-2 bg-primary-600 text-white rounded hover:bg-primary-700 disabled:opacity-50"
            >
              {isLoading ? 'Recording...' : 'Record Payment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 