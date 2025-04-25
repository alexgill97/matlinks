'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/app/lib/supabase/client'
import { updateRank, deleteRank } from './actions'

export default function EditRankPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const rankId = parseInt(params.id, 10);
  
  // State for form fields
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [order, setOrder] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  // Fetch rank data
  useEffect(() => {
    async function fetchRank() {
      try {
        setIsLoading(true);
        const supabase = createClient();
        const { data, error } = await supabase
          .from('ranks')
          .select('*')
          .eq('id', rankId)
          .single();

        if (error) {
          throw error;
        }

        if (data) {
          setName(data.name);
          setDescription(data.description || '');
          setOrder(data.order !== null ? data.order.toString() : '');
        }
      } catch (error) {
        console.error('Error fetching rank:', error);
        setError('Failed to load rank. Please try again.');
      } finally {
        setIsLoading(false);
      }
    }

    if (rankId) {
      fetchRank();
    }
  }, [rankId]);

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSaving(true);

    try {
      const formData = new FormData();
      formData.append('id', rankId.toString());
      formData.append('name', name);
      formData.append('description', description);
      if (order) {
        formData.append('order', order);
      }

      const result = await updateRank(formData);
      
      if (result?.error) {
        setError(result.error);
        setIsSaving(false);
        return;
      }

      // Success - redirect to ranks list
      router.push('/admin/ranks');
      router.refresh();
    } catch (err) {
      console.error('Error updating rank:', err);
      setError('An error occurred while saving the rank.');
      setIsSaving(false);
    }
  };

  // Handle delete
  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this rank?')) {
      return;
    }

    setIsDeleting(true);
    try {
      const result = await deleteRank(rankId);
      
      if (result?.error) {
        setError(result.error);
        setIsDeleting(false);
        return;
      }

      // Success - redirect to ranks list
      router.push('/admin/ranks');
      router.refresh();
    } catch (err) {
      console.error('Error deleting rank:', err);
      setError('An error occurred while deleting the rank.');
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return <div className="p-4">Loading rank data...</div>;
  }

  return (
    <div className="p-4 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Edit Rank</h1>
      
      {error && (
        <div className="bg-red-50 text-red-500 p-3 rounded-md mb-4">
          {error}
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="name" className="block text-sm font-medium mb-1">
            Rank Name*
          </label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-md border border-gray-300 p-2"
            required
          />
        </div>
        
        <div>
          <label htmlFor="description" className="block text-sm font-medium mb-1">
            Description
          </label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full rounded-md border border-gray-300 p-2 h-24"
          />
        </div>
        
        <div>
          <label htmlFor="order" className="block text-sm font-medium mb-1">
            Order (optional)
          </label>
          <input
            id="order"
            type="number"
            value={order}
            onChange={(e) => setOrder(e.target.value)}
            className="w-full rounded-md border border-gray-300 p-2"
            placeholder="Leave blank to auto-assign"
          />
          <p className="text-sm text-gray-500 mt-1">
            Lower numbers come first. Use this to establish a hierarchy of ranks.
          </p>
        </div>
        
        <div className="flex justify-between pt-4">
          <div>
            <button
              type="button"
              onClick={() => router.push('/admin/ranks')}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 mr-2"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              {isSaving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
          
          <button
            type="button"
            onClick={handleDelete}
            disabled={isDeleting}
            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
          >
            {isDeleting ? 'Deleting...' : 'Delete Rank'}
          </button>
        </div>
      </form>
    </div>
  )
} 