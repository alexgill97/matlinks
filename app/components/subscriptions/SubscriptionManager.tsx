'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDate } from '@/app/lib/utils';
import { AlertCircle, CheckCircle, Calendar, CreditCard, Package, ArrowRight } from 'lucide-react';

type MembershipPlan = {
  id: number;
  name: string;
  description: string | null;
  price: number | null;
  interval: string | null;
  features: string[] | null;
};

type SubscriptionDetails = {
  id: string;
  current_period_start: string;
  current_period_end: string;
  status: string;
  cancel_at_period_end: boolean;
  payment_method?: {
    brand: string;
    last4: string;
    exp_month: number;
    exp_year: number;
  };
};

type SubscriptionManagerProps = {
  currentPlanId: number | null;
  subscriptionId: string | null;
  isMemberProfile?: boolean;
};

export function SubscriptionManager({ 
  currentPlanId, 
  subscriptionId,
  isMemberProfile = true
}: SubscriptionManagerProps) {
  const router = useRouter();
  const [currentPlan, setCurrentPlan] = useState<MembershipPlan | null>(null);
  const [availablePlans, setAvailablePlans] = useState<MembershipPlan[]>([]);
  const [subscription, setSubscription] = useState<SubscriptionDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);
  const [isChangingPlan, setIsChangingPlan] = useState(false);
  const [showConfirmCancel, setShowConfirmCancel] = useState(false);
  const [showPlanChange, setShowPlanChange] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState<number | null>(null);
  const [actionMessage, setActionMessage] = useState<{type: 'success' | 'error' | 'info', message: string} | null>(null);
  
  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      setError(null);
      
      try {
        // Fetch current plan if exists
        if (currentPlanId) {
          const planResponse = await fetch(`/api/membership-plans/${currentPlanId}`);
          if (planResponse.ok) {
            const planData = await planResponse.json();
            setCurrentPlan(planData);
          }
        }
        
        // Fetch subscription details if exists
        if (subscriptionId) {
          const subscriptionResponse = await fetch(`/api/subscriptions/${subscriptionId}`);
          if (subscriptionResponse.ok) {
            const subscriptionData = await subscriptionResponse.json();
            setSubscription(subscriptionData);
          }
        }
        
        // Fetch available plans for upgrades/downgrades
        const plansResponse = await fetch('/api/membership-plans?active=true');
        if (plansResponse.ok) {
          const plansData = await plansResponse.json();
          setAvailablePlans(plansData);
        }
      } catch (err) {
        console.error('Error loading subscription data:', err);
        setError('Failed to load subscription information. Please try again later.');
      } finally {
        setIsLoading(false);
      }
    }
    
    loadData();
  }, [currentPlanId, subscriptionId]);
  
  const handleCancelSubscription = async () => {
    if (!subscriptionId) return;
    
    setIsCancelling(true);
    setActionMessage(null);
    
    try {
      const response = await fetch(`/api/subscriptions/${subscriptionId}/cancel`, {
        method: 'POST',
      });
      
      if (response.ok) {
        setSubscription(prev => prev ? { ...prev, cancel_at_period_end: true } : null);
        setActionMessage({ 
          type: 'success', 
          message: 'Your subscription has been cancelled and will end at the billing period.' 
        });
      } else {
        const data = await response.json();
        setActionMessage({ 
          type: 'error', 
          message: data.error || 'Failed to cancel subscription.' 
        });
      }
    } catch (err) {
      console.error('Error cancelling subscription:', err);
      setActionMessage({ 
        type: 'error', 
        message: 'An unexpected error occurred. Please try again.' 
      });
    } finally {
      setIsCancelling(false);
      setShowConfirmCancel(false);
    }
  };
  
  const handleChangePlan = async () => {
    if (!subscriptionId || !selectedPlanId) return;
    
    setIsChangingPlan(true);
    setActionMessage(null);
    
    try {
      const response = await fetch(`/api/subscriptions/${subscriptionId}/change-plan`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ planId: selectedPlanId }),
      });
      
      if (response.ok) {
        // Refresh the page to show updated plan
        router.refresh();
        
        setActionMessage({ 
          type: 'success', 
          message: 'Your subscription plan has been updated successfully.' 
        });
        
        // Close the dialog and reset selected plan
        setShowPlanChange(false);
        setSelectedPlanId(null);
      } else {
        const data = await response.json();
        setActionMessage({ 
          type: 'error', 
          message: data.error || 'Failed to change subscription plan.' 
        });
      }
    } catch (err) {
      console.error('Error changing subscription plan:', err);
      setActionMessage({ 
        type: 'error', 
        message: 'An unexpected error occurred. Please try again.' 
      });
    } finally {
      setIsChangingPlan(false);
    }
  };
  
  const formatPrice = (price: number | null, interval: string | null) => {
    if (price === null) return 'Free';
    
    const amount = (price / 100).toFixed(2);
    
    switch (interval) {
      case 'month': return `$${amount}/month`;
      case 'year': return `$${amount}/year`;
      case 'week': return `$${amount}/week`;
      case 'day': return `$${amount}/day`;
      default: return `$${amount}`;
    }
  };
  
  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-3/4" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }
  
  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }
  
  if (!currentPlan && isMemberProfile) {
    return (
      <div className="space-y-6">
        <Alert variant="default">
          <AlertTitle>No Active Subscription</AlertTitle>
          <AlertDescription>
            You don't currently have an active membership plan. View our available plans to get started.
          </AlertDescription>
        </Alert>
        
        <div className="flex justify-center">
          <Button onClick={() => router.push('/memberships')}>
            View Available Plans
          </Button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      {actionMessage && (
        <Alert variant={actionMessage.type === 'error' ? 'destructive' : 'default'}>
          {actionMessage.type === 'success' ? (
            <CheckCircle className="h-4 w-4" />
          ) : (
            <AlertCircle className="h-4 w-4" />
          )}
          <AlertDescription>{actionMessage.message}</AlertDescription>
        </Alert>
      )}
      
      {currentPlan && (
        <Card>
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle>{currentPlan.name}</CardTitle>
                <CardDescription>{currentPlan.description}</CardDescription>
              </div>
              
              {subscription && (
                <Badge 
                  variant={
                    subscription.status === 'active' ? 'default' :
                    subscription.status === 'trialing' ? 'secondary' :
                    subscription.status === 'past_due' ? 'destructive' :
                    'outline'
                  }
                >
                  {subscription.status}
                  {subscription.cancel_at_period_end && ' (Cancelling)'}
                </Badge>
              )}
            </div>
          </CardHeader>
          
          <CardContent>
            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <h3 className="font-medium mb-2 flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  Plan Details
                </h3>
                
                <div className="text-2xl font-bold mb-4">
                  {formatPrice(currentPlan.price, currentPlan.interval)}
                </div>
                
                {currentPlan.features && currentPlan.features.length > 0 && (
                  <div className="space-y-1">
                    {currentPlan.features.map((feature, index) => (
                      <div key={index} className="flex items-start gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                        <span>{feature}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              {subscription && (
                <div>
                  <h3 className="font-medium mb-2 flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Billing Details
                  </h3>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Current Period</span>
                      <span>
                        {formatDate(subscription.current_period_start)} - {formatDate(subscription.current_period_end)}
                      </span>
                    </div>
                    
                    {subscription.payment_method && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Payment Method</span>
                        <span className="flex items-center">
                          <CreditCard className="h-4 w-4 mr-2" />
                          {subscription.payment_method.brand.toUpperCase()} •••• {subscription.payment_method.last4}
                        </span>
                      </div>
                    )}
                    
                    {subscription.cancel_at_period_end && (
                      <Alert className="mt-4 bg-yellow-50 border-yellow-200 text-yellow-800">
                        <AlertDescription>
                          Your subscription will end on {formatDate(subscription.current_period_end)}. You'll still have access until then.
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
          
          {subscription && !subscription.cancel_at_period_end && (
            <CardFooter className="flex justify-between border-t p-6">
              <Button
                variant="outline"
                onClick={() => setShowConfirmCancel(true)}
              >
                Cancel Subscription
              </Button>
              
              <Button
                onClick={() => setShowPlanChange(true)}
              >
                Change Plan
              </Button>
            </CardFooter>
          )}
        </Card>
      )}
      
      {/* Cancel Confirmation Dialog */}
      <Dialog open={showConfirmCancel} onOpenChange={setShowConfirmCancel}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Cancellation</DialogTitle>
            <DialogDescription>
              Are you sure you want to cancel your subscription? Your subscription will remain active until the end of your current billing period ({subscription ? formatDate(subscription.current_period_end) : 'the end of your billing period'}).
            </DialogDescription>
          </DialogHeader>
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowConfirmCancel(false)}
              disabled={isCancelling}
            >
              Keep Subscription
            </Button>
            <Button
              variant="destructive"
              onClick={handleCancelSubscription}
              disabled={isCancelling}
            >
              {isCancelling ? 'Cancelling...' : 'Confirm Cancellation'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Change Plan Dialog */}
      <Dialog open={showPlanChange} onOpenChange={setShowPlanChange}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Change Subscription Plan</DialogTitle>
            <DialogDescription>
              Select a new plan below. Your billing will be adjusted accordingly, and changes will take effect immediately.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            {availablePlans
              .filter(plan => plan.id !== currentPlanId)
              .map(plan => (
                <Card key={plan.id} className={`cursor-pointer transition-all ${selectedPlanId === plan.id ? 'ring-2 ring-primary' : 'hover:shadow-md'}`}>
                  <CardHeader className="pb-2">
                    <div className="flex justify-between">
                      <CardTitle>{plan.name}</CardTitle>
                      <div className="text-lg font-bold">{formatPrice(plan.price, plan.interval)}</div>
                    </div>
                    <CardDescription>{plan.description}</CardDescription>
                  </CardHeader>
                  <CardFooter className="pt-2 flex justify-between">
                    <div>
                      {plan.features && plan.features.slice(0, 2).map((feature, idx) => (
                        <div key={idx} className="flex items-center text-sm">
                          <CheckCircle className="h-3 w-3 text-green-500 mr-2" /> {feature}
                        </div>
                      ))}
                    </div>
                    <Button 
                      variant={selectedPlanId === plan.id ? "default" : "outline"}
                      onClick={() => setSelectedPlanId(plan.id)}
                      size="sm"
                    >
                      {selectedPlanId === plan.id ? "Selected" : "Select"}
                    </Button>
                  </CardFooter>
                </Card>
              ))}
          </div>
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowPlanChange(false);
                setSelectedPlanId(null);
              }}
              disabled={isChangingPlan}
            >
              Cancel
            </Button>
            <Button
              onClick={handleChangePlan}
              disabled={isChangingPlan || !selectedPlanId}
            >
              {isChangingPlan ? 'Processing...' : 'Confirm Change'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 