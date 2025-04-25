'use client'\n\nimport { useState } from 'react'\nimport { addClassType } from '@/app/admin/class-types/new/actions' // Action to be created\nimport { useRouter } from 'next/navigation'\n\nexport default function NewClassTypePage() {\n  const router = useRouter()\n  const [error, setError] = useState<string | null>(null)\n  const [isSubmitting, setIsSubmitting] = useState(false)\n\n  // Form state\n  const [name, setName] = useState('')\n  const [description, setDescription] = useState('')\n  const [duration, setDuration] = useState<string>('')\n  const [difficulty, setDifficulty] = useState('')\n  // Add state for prerequisites, capacity etc. if needed\n\n  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {\n    event.preventDefault()\n    setError(null)\n    setIsSubmitting(true)\n\n    // --- Client-side Validation (Optional but recommended) ---\n    let durationValue: number | null = null;\n    if (duration) {\n        const parsedDuration = parseInt(duration, 10);\n        if (isNaN(parsedDuration) || parsedDuration <= 0) {\n            setError("Invalid duration value. Please enter a positive whole number of minutes.");\n            setIsSubmitting(false);\n            return;\n        }\n        durationValue = parsedDuration;\n    }\n    // ---------------------------------------------------------\n\n    const formData = new FormData()\n    formData.append('name', name);\n    formData.append('description', description);\n    if (durationValue !== null) {\n        formData.append('duration', durationValue.toString());\n    }\n    formData.append('difficulty_level', difficulty);\n    // Append other fields\n\n    const result = await addClassType(formData)\n\n    setIsSubmitting(false)\n\n    if (result?.error) {\n      setError(result.error)\n    } else {\n      router.push('/admin/class-types') // Redirect to list on success\n      router.refresh(); \n    }\n  }\n\n  return (\n    <div className="container mx-auto">\n      <h1 className="mb-6 text-3xl font-bold">Add New Class Type</h1>\n\n      <form onSubmit={handleSubmit} className="p-6 bg-white rounded shadow">\n        {error && <p className="mb-4 text-sm text-red-600">Error: {error}</p>}\n\n        {/* --- Class Type Name --- */} \n        <div className="mb-4">\n          <label htmlFor="name" className="block mb-1 text-sm font-medium text-secondary-700">Name</label>\n          <input\n            type="text"\
            id="name"\
            name="name"\
            required\
            value={name}\
            onChange={(e) => setName(e.target.value)}\
            disabled={isSubmitting}\
            className="w-full px-3 py-2 border rounded border-secondary-300 focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500 disabled:opacity-50"\
          />\
        </div>\n\n        {/* --- Description --- */} \n        <div className="mb-4">\n          <label htmlFor="description" className="block mb-1 text-sm font-medium text-secondary-700">Description</label>\n          <textarea\
          id="description"\
          name="description"\
          rows={3}\
          value={description}\
          onChange={(e) => setDescription(e.target.value)}\
          disabled={isSubmitting}\
          className="w-full px-3 py-2 border rounded border-secondary-300 focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500 disabled:opacity-50"\
        ></textarea>\
      </div>\n\n         {/* --- Duration --- */} \n        <div className="mb-4">\n          <label htmlFor="duration" className="block mb-1 text-sm font-medium text-secondary-700">Duration (minutes)</label>\n          <input\
          type="number"\
          id="duration"\
          name="duration"\
          min="1"\
          step="1"\
          value={duration}\
          onChange={(e) => setDuration(e.target.value)}\
          placeholder="e.g., 60"\
          disabled={isSubmitting}\
          className="w-full px-3 py-2 border rounded border-secondary-300 focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500 disabled:opacity-50"\
        />\
      </div>\n\n        {/* --- Difficulty Level --- */} \n        <div className="mb-4">\n          <label htmlFor="difficulty_level" className="block mb-1 text-sm font-medium text-secondary-700">Difficulty Level</label>\n          <input\
          type="text"\
          id="difficulty_level"\
          name="difficulty_level"\
          value={difficulty}\
          onChange={(e) => setDifficulty(e.target.value)}\
          placeholder="e.g., Beginner, Advanced, All Levels"\
          disabled={isSubmitting}\
          className="w-full px-3 py-2 border rounded border-secondary-300 focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500 disabled:opacity-50"\
        />\
      </div>\n        \n        {/* TODO: Add fields for prerequisites, capacity etc. */} \n\n         {/* --- Buttons --- */} \n        <div className="flex justify-end space-x-3 mt-6">\n           <button \
          type="button" \
          onClick={() => router.back()} \
          className="px-4 py-2 transition duration-200 ease-in-out border rounded border-secondary-300 text-secondary-700 hover:bg-secondary-50 disabled:opacity-50"\
          disabled={isSubmitting}\
        >\
        Cancel\
      </button>\n          <button\
        type="submit"\
        disabled={isSubmitting}\
        className={`px-4 py-2 font-semibold text-white transition duration-200 ease-in-out rounded ${isSubmitting ? 'bg-primary-400 cursor-not-allowed' : 'bg-primary-600 hover:bg-primary-700'} focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-opacity-50 disabled:opacity-50`}\
      >\
        {isSubmitting ? 'Saving...' : 'Add Class Type'}\
      </button>\
    </div>\
  </form>\
</div>\
) 