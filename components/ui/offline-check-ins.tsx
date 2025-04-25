'use client'

import { useState, useEffect } from 'react'
import { 
  getPendingCheckIns, 
  syncOfflineCheckIns, 
  clearAllPendingCheckIns,
  type OfflineCheckIn
} from '@/app/locations/[locationId]/check-in/offline-store'
import { 
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Loader2, CloudOff, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

export function OfflineCheckInsManager() {
  const [pendingCheckIns, setPendingCheckIns] = useState<OfflineCheckIn[]>([])
  const [isSyncing, setIsSyncing] = useState(false)
  const [syncMessage, setSyncMessage] = useState<string | null>(null)
  const [isOpen, setIsOpen] = useState(false)
  
  // Load pending check-ins
  useEffect(() => {
    // Initial load
    setPendingCheckIns(getPendingCheckIns())
    
    // Set up periodic checks and online status changes
    const checkInterval = setInterval(() => {
      setPendingCheckIns(getPendingCheckIns())
    }, 30000) // Check every 30 seconds
    
    // Auto-sync when back online
    const handleOnline = () => {
      if (getPendingCheckIns().length > 0) {
        handleSync()
      }
    }
    
    window.addEventListener('online', handleOnline)
    
    return () => {
      clearInterval(checkInterval)
      window.removeEventListener('online', handleOnline)
    }
  }, [])
  
  // Auto-open if there are pending check-ins
  useEffect(() => {
    if (pendingCheckIns.length > 0 && !isOpen) {
      setIsOpen(true)
    } else if (pendingCheckIns.length === 0 && isOpen) {
      setIsOpen(false)
    }
  }, [pendingCheckIns.length, isOpen])
  
  // Handle sync
  const handleSync = async () => {
    if (isSyncing || pendingCheckIns.length === 0) return
    
    setIsSyncing(true)
    setSyncMessage('Syncing check-ins...')
    
    try {
      const result = await syncOfflineCheckIns()
      
      if (result.success) {
        setSyncMessage(`Synced ${result.synced} of ${result.total} check-ins`)
      } else if (!navigator.onLine) {
        setSyncMessage('You are currently offline. Will sync when back online.')
      } else {
        setSyncMessage(`Sync partially failed. ${result.synced} of ${result.total} synced.`)
      }
      
      // Refresh the list
      setPendingCheckIns(getPendingCheckIns())
      
      // Auto-clear message after 5 seconds
      setTimeout(() => {
        setSyncMessage(null)
      }, 5000)
    } catch (error) {
      setSyncMessage(`Sync error: ${error}`)
    } finally {
      setIsSyncing(false)
    }
  }
  
  // Format timestamp
  const formatTime = (timestamp: string) => {
    try {
      return formatDistanceToNow(new Date(timestamp), { addSuffix: true })
    } catch {
      return timestamp
    }
  }
  
  // If no pending check-ins, return null or minimal component
  if (pendingCheckIns.length === 0) {
    return null
  }
  
  return (
    <Collapsible
      open={isOpen}
      onOpenChange={setIsOpen}
      className="w-full bg-yellow-50 border border-yellow-200 rounded-md mt-4"
    >
      <div className="p-4 flex justify-between items-center">
        <div className="flex items-center">
          <CloudOff className="h-5 w-5 text-yellow-600 mr-2" />
          <div>
            <h3 className="text-sm font-medium text-yellow-800">
              Offline Check-ins Pending
            </h3>
            <p className="text-xs text-yellow-600">
              {pendingCheckIns.length} check-in{pendingCheckIns.length !== 1 ? 's' : ''} waiting to sync
            </p>
          </div>
        </div>
        
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleSync}
            disabled={isSyncing || !navigator.onLine}
            className="bg-white"
          >
            {isSyncing ? (
              <Loader2 className="h-4 w-4 animate-spin mr-1" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-1" />
            )}
            Sync Now
          </Button>
          
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm">
              {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </CollapsibleTrigger>
        </div>
      </div>
      
      {syncMessage && (
        <div className="px-4 pb-2">
          <p className="text-xs text-yellow-700">{syncMessage}</p>
        </div>
      )}
      
      <CollapsibleContent>
        <div className="px-4 pb-4">
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {pendingCheckIns.map((checkIn) => (
              <div 
                key={checkIn.id}
                className="bg-white p-3 rounded border border-yellow-100 flex justify-between items-center"
              >
                <div>
                  <div className="font-medium text-sm">
                    {checkIn.memberName || 'Member'} 
                    {checkIn.className && (
                      <span className="font-normal"> • {checkIn.className}</span>
                    )}
                  </div>
                  <div className="text-xs text-gray-500">
                    {formatTime(checkIn.timestamp)}
                  </div>
                </div>
                
                <Badge variant={checkIn.retryCount > 2 ? 'destructive' : 'outline'}>
                  {checkIn.retryCount > 2 
                    ? 'Sync Failed' 
                    : 'Pending'}
                </Badge>
              </div>
            ))}
          </div>
          
          <div className="mt-4 flex gap-2 justify-end">
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-xs"
              onClick={() => {
                if (confirm('Are you sure you want to discard all pending check-ins? This cannot be undone.')) {
                  clearAllPendingCheckIns()
                  setPendingCheckIns([])
                }
              }}
            >
              Discard All
            </Button>
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
} 