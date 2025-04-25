'use client'

import { useState, useEffect, useCallback } from 'react'
import { updateGym, deleteGym } from '@/app/admin/gyms/[id]/edit/actions'
import { useRouter } from 'next/navigation'
import { createClient } from '@/app/lib/supabase/client'

// Define Gym type (ideally generated from Supabase types later)
type Gym = {
  id: number;
  name: string;
  description: string | null;
  logo_url: string | null; // Add logo_url
};

export default function EditGymPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const supabase = createClient()
  const gymId = parseInt(params.id, 10)

  const [gym, setGym] = useState<Gym | null>(null)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [currentLogoUrl, setCurrentLogoUrl] = useState<string | null>(null); // State for existing logo
  const [newLogoFile, setNewLogoFile] = useState<File | null>(null); // State for new logo file
  const [logoPreview, setLogoPreview] = useState<string | null>(null); // State for new logo preview
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  // Fetch gym data including logo_url
  const fetchGym = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    const { data, error: fetchError } = await supabase
      .from('gyms')
      .select('id, name, description, logo_url') // Select logo_url
      .eq('id', gymId)
      .single()

    if (fetchError) {
      console.error('Error fetching gym:', fetchError)
      setError('Failed to load gym data. Please try again.')
      setGym(null)
    } else if (data) {
      setGym(data)
      setName(data.name)
      setDescription(data.description || '')
      setCurrentLogoUrl(data.logo_url); // Set current logo URL
      setLogoPreview(data.logo_url); // Initialize preview with current logo
    } else {
        setError('Gym not found.')
    }
    setIsLoading(false)
  }, [gymId, supabase])

  useEffect(() => {
    if (gymId) {
      fetchGym()
    }
  }, [gymId, fetchGym])

  // Handle new logo file selection and preview
  const handleLogoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    setNewLogoFile(file || null);
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      // If no file selected, revert preview to current logo (if exists)
      setLogoPreview(currentLogoUrl);
      // Ensure newLogoFile is also cleared if selection is cancelled
      setNewLogoFile(null); 
    }
  };

  // Handle explicit logo removal request
  const handleRemoveLogo = () => {
    // Clear the file input visually (optional, can be tricky)
    const fileInput = document.getElementById('logo') as HTMLInputElement;
    if (fileInput) fileInput.value = ''; 
    
    setNewLogoFile(null); // Ensure no new file is considered
    setLogoPreview(null); // Clear the preview
    // We'll signal removal in handleSubmit using a flag or state
    // No immediate action needed here, submit will handle it.
    // Consider adding a visual indicator that logo removal is staged.
  };

  // Handle form submission
  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    setIsSubmitting(true)

    const formData = new FormData()
    formData.append('id', gymId.toString())
    formData.append('name', name)
    formData.append('description', description)
    if (newLogoFile) {
      formData.append('logo', newLogoFile);
    }
    // Optionally add a field to indicate if logo should be removed
    // Signal removal if preview is null AND there's no new file staged
    if (logoPreview === null && !newLogoFile && currentLogoUrl) {
       formData.append('remove_logo', 'true');
    }

    const result = await updateGym(formData)

    setIsSubmitting(false)
    if (result?.error) {
      setError(result.error)
    } else {
      router.push('/admin/gyms')
    }
  }

  // ... (Keep handleDelete function) ...
  const handleDelete = async () => {
    // Simple confirmation for now
    if (!window.confirm(`Are you sure you want to delete gym "${gym?.name || 'this gym'}"? This cannot be undone.`)) {
      return
    }
    setError(null)
    setIsDeleting(true)
    const result = await deleteGym(gymId) // Call delete action
    setIsDeleting(false)
    if (result?.error) {
      setError(result.error)
    } else {
      router.push('/admin/gyms')
      router.refresh()
    }
  }

  // ... (Keep loading and error states rendering) ...
  if (isLoading) {
    return <div className="text-center p-6">Loading gym details...</div>
  }

  if (!gym && !isLoading) {
     return <div className="text-center p-6 text-red-600">Error: {error || 'Gym not found.'}</div>
  }


  return (
    <div className="container mx-auto">
      <h1 className="mb-6 text-3xl font-bold">Edit Gym: {gym?.name}</h1>

      <form onSubmit={handleSubmit} className="p-6 bg-white rounded shadow">
         {/* ... (Error display) ... */}
         {error && !isSubmitting && !isDeleting && (
          <p className="mb-4 text-sm text-red-600">Error: {error}</p>
        )}

        {/* ... (Hidden input and Name/Description fields) ... */}
        <input type="hidden" name="id" value={gymId} />
        <div className="mb-4">
          <label htmlFor="name" className="block mb-1 text-sm font-medium text-secondary-700">Gym Name</label>
          <input
            type="text"
            id="name"
            name="name"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3 py-2 border rounded border-secondary-300 focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
            disabled={isSubmitting || isDeleting}
          />
        </div>
        <div className="mb-4">
          <label htmlFor="description" className="block mb-1 text-sm font-medium text-secondary-700">Description</label>
          <textarea
            id="description"
            name="description"
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full px-3 py-2 border rounded border-secondary-300 focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
             disabled={isSubmitting || isDeleting}
          ></textarea>
        </div>

        {/* --- Logo Upload/Preview Field --- */}
        <div className="mb-4">
          <label htmlFor="logo" className="block mb-1 text-sm font-medium text-secondary-700">Logo</label>
          {logoPreview && (
            <div className="mb-2">
              <img src={logoPreview} alt="Current Logo" className="object-contain h-24 border rounded" />
            </div>
          )}
          <input
            type="file"
            id="logo"
            name="logo"
            accept="image/png, image/jpeg, image/webp"
            onChange={handleLogoChange}
            disabled={isSubmitting || isDeleting}
            className="w-full text-sm border rounded file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100 text-secondary-500 disabled:opacity-50"
          />
          <p className="mt-1 text-xs text-secondary-500">Upload a new logo to replace the existing one (if any).</p>
          {/* Add button to explicitly remove logo */} 
          {currentLogoUrl && logoPreview && (
            <button 
              type="button"
              onClick={handleRemoveLogo}
              disabled={isSubmitting || isDeleting} // Disable during actions
              className="mt-2 px-3 py-1 text-sm font-medium text-red-700 transition duration-150 ease-in-out bg-red-100 border border-transparent rounded hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Remove Logo
            </button>
          )}
        </div>
        {/* --------------------------------- */}

        {/* ... (Delete/Cancel/Update buttons) ... */}
         <div className="flex items-center justify-between mt-6">
           <button
            type="button"
            onClick={handleDelete}
            disabled={isDeleting || isSubmitting}
            className={`px-4 py-2 font-semibold text-white transition duration-200 ease-in-out rounded ${isDeleting ? 'bg-red-400 cursor-not-allowed' : 'bg-red-600 hover:bg-red-700'} focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-50`}
           >
             {isDeleting ? 'Deleting...' : 'Delete Gym'}
           </button>
          <div className="flex space-x-3">
            <button type="button" onClick={() => router.back()} className="px-4 py-2 transition duration-200 ease-in-out border rounded border-secondary-300 text-secondary-700 hover:bg-secondary-50">
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || isDeleting}
              className={`px-4 py-2 font-semibold text-white transition duration-200 ease-in-out rounded ${isSubmitting || isDeleting ? 'bg-primary-400 cursor-not-allowed' : 'bg-primary-600 hover:bg-primary-700'} focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-opacity-50`}
            >
              {isSubmitting ? 'Saving...' : 'Update Gym'}
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}