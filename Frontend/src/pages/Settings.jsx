import { useState, useEffect } from 'react'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Save, Users } from 'lucide-react'
import apiClient from '../lib/api'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Link } from 'react-router-dom'
import { useAuthStore } from '../store/auth'

const settingsSchema = z.object({
  taxRate: z.number().min(0).max(100),
  insuranceRate: z.number().min(0).max(100),
  payPeriodDays: z.number().min(1).max(31),
})

export default function Settings() {
  const [loading, setLoading] = useState(true)
  const [settings, setSettings] = useState(null)

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm({
    resolver: zodResolver(settingsSchema),
  })

  useEffect(() => {
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    try {
      const response = await apiClient.get('/settings')
      setSettings(response.data)
      reset(response.data)
    } catch (error) {
      console.error('Failed to fetch settings:', error)
    } finally {
      setLoading(false)
    }
  }

  const onSubmit = async (data) => {
    try {
      await apiClient.put('/settings', data)
      toast.success('Settings saved successfully')
      fetchSettings()
    } catch (error) {
      console.error('Failed to save settings:', error)
    }
  }

  if (loading) {
    return <div>Loading...</div>
  }

  const { user } = useAuthStore()
  const isAdmin = user?.role === 'admin'

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Settings</h1>
          <p className="text-muted-foreground">Manage system settings</p>
        </div>
        {isAdmin && (
          <Link to="/user-settings">
            <Button variant="outline">
              <Users className="mr-2 h-4 w-4" />
              User Settings
            </Button>
          </Link>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Payroll Settings</CardTitle>
          <CardDescription>
            Configure payroll calculation settings
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="taxRate">Tax Rate (%)</Label>
                <Input
                  id="taxRate"
                  type="number"
                  step="0.01"
                  {...register('taxRate', { valueAsNumber: true })}
                  aria-invalid={errors.taxRate ? 'true' : 'false'}
                />
                {errors.taxRate && (
                  <p className="text-sm text-destructive">
                    {errors.taxRate.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="insuranceRate">Insurance Rate (%)</Label>
                <Input
                  id="insuranceRate"
                  type="number"
                  step="0.01"
                  {...register('insuranceRate', { valueAsNumber: true })}
                  aria-invalid={errors.insuranceRate ? 'true' : 'false'}
                />
                {errors.insuranceRate && (
                  <p className="text-sm text-destructive">
                    {errors.insuranceRate.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="payPeriodDays">Pay Period Days</Label>
                <Input
                  id="payPeriodDays"
                  type="number"
                  {...register('payPeriodDays', { valueAsNumber: true })}
                  aria-invalid={errors.payPeriodDays ? 'true' : 'false'}
                />
                {errors.payPeriodDays && (
                  <p className="text-sm text-destructive">
                    {errors.payPeriodDays.message}
                  </p>
                )}
              </div>
            </div>
            <Button type="submit">
              <Save className="mr-2 h-4 w-4" />
              Save Settings
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

