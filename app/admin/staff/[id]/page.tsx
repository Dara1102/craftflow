'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'

interface LaborRole {
  id: number
  name: string
  isPrimary: boolean
}

interface StaffMember {
  id: number
  name: string
  email: string | null
  phone: string | null
  isActive: boolean
  isManager: boolean
  hireDate: string | null
  notes: string | null
  roles: LaborRole[]
}

interface AvailableRole {
  id: number
  name: string
}

export default function EditStaffPage() {
  const params = useParams()
  const router = useRouter()
  const staffId = params.id as string

  const [staff, setStaff] = useState<StaffMember | null>(null)
  const [roles, setRoles] = useState<AvailableRole[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    isManager: false,
    isActive: true,
    notes: '',
    roleIds: [] as number[],
    primaryRoleId: null as number | null
  })

  useEffect(() => {
    loadData()
  }, [staffId])

  const loadData = async () => {
    setLoading(true)
    setError(null)
    try {
      const [staffRes, rolesRes] = await Promise.all([
        fetch(`/api/staff/${staffId}`),
        fetch('/api/labor-roles')
      ])

      if (!staffRes.ok) {
        if (staffRes.status === 404) {
          setError('Staff member not found')
        } else {
          setError('Failed to load staff member')
        }
        setLoading(false)
        return
      }

      const staffData = await staffRes.json()
      setStaff(staffData)

      // Initialize form with staff data
      const primaryRole = staffData.roles.find((r: LaborRole) => r.isPrimary)
      setFormData({
        name: staffData.name || '',
        email: staffData.email || '',
        phone: staffData.phone || '',
        isManager: staffData.isManager || false,
        isActive: staffData.isActive ?? true,
        notes: staffData.notes || '',
        roleIds: staffData.roles.map((r: LaborRole) => r.id),
        primaryRoleId: primaryRole?.id || null
      })

      if (rolesRes.ok) {
        const rolesData = await rolesRes.json()
        setRoles(rolesData)
      }
    } catch (err) {
      console.error('Failed to load data:', err)
      setError('Failed to load staff member')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!formData.name.trim()) {
      setError('Name is required')
      return
    }

    setSaving(true)
    setError(null)

    try {
      const res = await fetch(`/api/staff/${staffId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email || null,
          phone: formData.phone || null,
          isManager: formData.isManager,
          isActive: formData.isActive,
          notes: formData.notes || null,
          roleIds: formData.roleIds,
          primaryRoleId: formData.primaryRoleId
        })
      })

      if (res.ok) {
        router.push('/admin/staff')
      } else {
        const errorData = await res.json()
        setError(errorData.error || 'Failed to save changes')
      }
    } catch (err) {
      console.error('Failed to save:', err)
      setError('Failed to save changes')
    } finally {
      setSaving(false)
    }
  }

  const toggleRole = (roleId: number) => {
    setFormData(prev => {
      const newRoleIds = prev.roleIds.includes(roleId)
        ? prev.roleIds.filter(id => id !== roleId)
        : [...prev.roleIds, roleId]

      // If removing the primary role, clear primaryRoleId
      const newPrimaryRoleId = prev.primaryRoleId === roleId && !newRoleIds.includes(roleId)
        ? null
        : prev.primaryRoleId

      return {
        ...prev,
        roleIds: newRoleIds,
        primaryRoleId: newPrimaryRoleId
      }
    })
  }

  const setPrimaryRole = (roleId: number) => {
    if (formData.roleIds.includes(roleId)) {
      setFormData(prev => ({
        ...prev,
        primaryRoleId: prev.primaryRoleId === roleId ? null : roleId
      }))
    }
  }

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  if (error && !staff) {
    return (
      <div className="max-w-3xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <p className="text-red-700 mb-4">{error}</p>
          <Link href="/admin/staff" className="text-pink-600 hover:text-pink-800">
            ← Back to Staff
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-6">
        <Link href="/admin/staff" className="text-sm text-gray-500 hover:text-gray-700 mb-2 inline-block">
          ← Back to Staff
        </Link>
        <h1 className="text-3xl font-bold text-gray-900">Edit Staff Member</h1>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {/* Form */}
      <div className="bg-white shadow sm:rounded-lg">
        <div className="px-4 py-5 sm:p-6 space-y-6">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full border rounded-md px-3 py-2 focus:ring-pink-500 focus:border-pink-500"
              placeholder="e.g., Sarah Baker or Baker 1"
            />
          </div>

          {/* Email & Phone */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full border rounded-md px-3 py-2 focus:ring-pink-500 focus:border-pink-500"
                placeholder="email@example.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Phone
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full border rounded-md px-3 py-2 focus:ring-pink-500 focus:border-pink-500"
                placeholder="(555) 123-4567"
              />
            </div>
          </div>

          {/* Roles */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Roles
            </label>
            <div className="flex flex-wrap gap-2">
              {roles.map(role => {
                const isSelected = formData.roleIds.includes(role.id)
                const isPrimary = formData.primaryRoleId === role.id
                return (
                  <div key={role.id} className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => toggleRole(role.id)}
                      className={`px-3 py-1 rounded-full text-sm ${
                        isSelected
                          ? isPrimary
                            ? 'bg-pink-600 text-white'
                            : 'bg-pink-100 text-pink-800'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {role.name}
                    </button>
                    {isSelected && (
                      <button
                        type="button"
                        onClick={() => setPrimaryRole(role.id)}
                        className={`text-xs px-1.5 py-0.5 rounded ${
                          isPrimary
                            ? 'bg-pink-600 text-white'
                            : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                        }`}
                        title={isPrimary ? 'Primary role' : 'Set as primary'}
                      >
                        ★
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Click a role to assign/unassign. Click ★ to set as primary role.
            </p>
          </div>

          {/* Manager & Active Status */}
          <div className="flex flex-wrap gap-6">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.isManager}
                onChange={(e) => setFormData({ ...formData, isManager: e.target.checked })}
                className="rounded border-gray-300 text-pink-600 focus:ring-pink-500"
              />
              <span className="text-sm font-medium text-gray-700">
                Manager (can sign off on production prep)
              </span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.isActive}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                className="rounded border-gray-300 text-pink-600 focus:ring-pink-500"
              />
              <span className="text-sm font-medium text-gray-700">
                Active
              </span>
            </label>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notes
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
              className="w-full border rounded-md px-3 py-2 focus:ring-pink-500 focus:border-pink-500"
              placeholder="Any additional notes about this staff member..."
            />
          </div>
        </div>

        {/* Actions */}
        <div className="px-4 py-4 sm:px-6 bg-gray-50 flex justify-between items-center rounded-b-lg">
          <Link
            href="/admin/staff"
            className="text-gray-600 hover:text-gray-800"
          >
            Cancel
          </Link>
          <button
            onClick={handleSave}
            disabled={saving || !formData.name.trim()}
            className="bg-pink-600 text-white px-6 py-2 rounded-md hover:bg-pink-700 disabled:opacity-50 transition"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  )
}
