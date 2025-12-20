'use client'

import { useState, useEffect } from 'react'
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
  orderCount: number
}

interface AvailableRole {
  id: number
  name: string
}

export default function StaffAdminPage() {
  const [staff, setStaff] = useState<StaffMember[]>([])
  const [roles, setRoles] = useState<AvailableRole[]>([])
  const [loading, setLoading] = useState(true)
  const [showInactive, setShowInactive] = useState(false)
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    isManager: false,
    roleIds: [] as number[]
  })

  useEffect(() => {
    loadData()
  }, [showInactive])

  const loadData = async () => {
    setLoading(true)
    try {
      const [staffRes, rolesRes] = await Promise.all([
        fetch(`/api/staff?includeInactive=${showInactive}`),
        fetch('/api/labor-roles')
      ])

      if (staffRes.ok) {
        const staffData = await staffRes.json()
        setStaff(staffData)
      }

      if (rolesRes.ok) {
        const rolesData = await rolesRes.json()
        setRoles(rolesData)
      }
    } catch (error) {
      console.error('Failed to load data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAddStaff = async () => {
    if (!formData.name.trim()) return

    setSaving(true)
    try {
      const res = await fetch('/api/staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      if (res.ok) {
        setShowAddForm(false)
        setFormData({ name: '', email: '', phone: '', isManager: false, roleIds: [] })
        loadData()
      } else {
        const errorData = await res.json()
        alert(errorData.error || 'Failed to add staff member')
      }
    } catch (error) {
      console.error('Failed to add staff:', error)
      alert('Failed to add staff member - network error')
    } finally {
      setSaving(false)
    }
  }

  const handleUpdateStaff = async (id: number, updates: Partial<StaffMember>) => {
    setSaving(true)
    try {
      const res = await fetch(`/api/staff/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      })

      if (res.ok) {
        loadData()
      } else {
        const error = await res.json()
        alert(error.error || 'Failed to update staff member')
      }
    } catch (error) {
      console.error('Failed to update staff:', error)
    } finally {
      setSaving(false)
      setEditingId(null)
    }
  }

  const handleDeleteStaff = async (id: number) => {
    if (!confirm('Are you sure you want to delete this staff member?')) return

    try {
      const res = await fetch(`/api/staff/${id}`, { method: 'DELETE' })

      if (res.ok) {
        loadData()
      } else {
        const error = await res.json()
        alert(error.error || 'Failed to delete staff member')
      }
    } catch (error) {
      console.error('Failed to delete staff:', error)
    }
  }

  const toggleRole = (roleId: number) => {
    setFormData(prev => ({
      ...prev,
      roleIds: prev.roleIds.includes(roleId)
        ? prev.roleIds.filter(id => id !== roleId)
        : [...prev.roleIds, roleId]
    }))
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="px-4 py-6 sm:px-0">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Staff</h1>
            <p className="mt-1 text-sm text-gray-500">
              {staff.length} staff member{staff.length !== 1 ? 's' : ''} | Manage your kitchen team
            </p>
          </div>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-sm text-gray-600">
              <input
                type="checkbox"
                checked={showInactive}
                onChange={(e) => setShowInactive(e.target.checked)}
                className="rounded border-gray-300"
              />
              Show inactive
            </label>
            <button
              onClick={() => setShowAddForm(true)}
              className="bg-pink-600 text-white px-4 py-2 rounded-md hover:bg-pink-700 transition"
            >
              Add Staff / Role
            </button>
          </div>
        </div>

        {/* Add Staff Form */}
        {showAddForm && (
          <div className="bg-white shadow sm:rounded-lg mb-6 p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Add Staff Member or Role Placeholder</h2>
            <p className="text-sm text-gray-500 mb-4">
              Add a specific person (e.g., &quot;Sarah Baker&quot;) or a role placeholder (e.g., &quot;Baker 1&quot;, &quot;Weekend Decorator&quot;) for scheduling.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name or Title *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full border rounded-md px-3 py-2"
                  placeholder="e.g., Sarah Baker or Baker 1"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email (optional)</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full border rounded-md px-3 py-2"
                  placeholder="email@example.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone (optional)</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full border rounded-md px-3 py-2"
                  placeholder="(555) 123-4567"
                />
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Roles</label>
              <div className="flex flex-wrap gap-2">
                {roles.map(role => (
                  <button
                    key={role.id}
                    type="button"
                    onClick={() => toggleRole(role.id)}
                    className={`px-3 py-1 rounded-full text-sm ${
                      formData.roleIds.includes(role.id)
                        ? 'bg-pink-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {role.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-4">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.isManager}
                  onChange={(e) => setFormData({ ...formData, isManager: e.target.checked })}
                  className="rounded border-gray-300 text-pink-600"
                />
                <span className="text-sm font-medium text-gray-700">Manager (can sign off on production prep)</span>
              </label>
            </div>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setShowAddForm(false)
                  setFormData({ name: '', email: '', phone: '', isManager: false, roleIds: [] })
                }}
                className="px-4 py-2 text-gray-700 hover:text-gray-900"
              >
                Cancel
              </button>
              <button
                onClick={handleAddStaff}
                disabled={saving || !formData.name.trim()}
                className="bg-pink-600 text-white px-4 py-2 rounded-md hover:bg-pink-700 disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Add'}
              </button>
            </div>
          </div>
        )}

        {/* Staff List */}
        {staff.length === 0 ? (
          <div className="bg-white shadow sm:rounded-lg p-8 text-center">
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
            <h3 className="mt-4 text-lg font-medium text-gray-900">No staff yet</h3>
            <p className="mt-2 text-sm text-gray-500">
              Add staff members or role placeholders (e.g., &quot;Baker 1&quot;, &quot;Decorator&quot;) to assign orders and track production.
            </p>
            <button
              onClick={() => setShowAddForm(true)}
              className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-pink-700 bg-pink-100 hover:bg-pink-200"
            >
              Add staff member or role
            </button>
          </div>
        ) : (
          <div className="bg-white shadow overflow-hidden sm:rounded-lg">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Staff Member
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Roles
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Contact
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Orders
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {staff.map((member) => (
                  <tr key={member.id} className={`hover:bg-gray-50 ${!member.isActive ? 'opacity-50' : ''}`}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className={`flex-shrink-0 h-10 w-10 rounded-full flex items-center justify-center ${
                          member.isManager ? 'bg-purple-100' : 'bg-blue-100'
                        }`}>
                          <span className={`font-medium text-sm ${
                            member.isManager ? 'text-purple-600' : 'text-blue-600'
                          }`}>
                            {member.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                          </span>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900 flex items-center gap-2">
                            {member.name}
                            {member.isManager && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">
                                Manager
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {member.roles.length === 0 ? (
                          <span className="text-gray-400 text-sm">No roles assigned</span>
                        ) : (
                          member.roles.map(role => (
                            <span
                              key={role.id}
                              className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                                role.isPrimary
                                  ? 'bg-pink-100 text-pink-800'
                                  : 'bg-gray-100 text-gray-700'
                              }`}
                            >
                              {role.name}
                            </span>
                          ))
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div>
                        {member.email && <div>{member.email}</div>}
                        {member.phone && <div>{member.phone}</div>}
                        {!member.email && !member.phone && <span className="text-gray-400">-</span>}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {member.orderCount} assigned
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        member.isActive
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {member.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/admin/staff/${member.id}`}
                          className="text-pink-600 hover:text-pink-800"
                        >
                          Edit
                        </Link>
                        <button
                          onClick={() => handleUpdateStaff(member.id, { isActive: !member.isActive })}
                          className="text-gray-600 hover:text-gray-800"
                        >
                          {member.isActive ? 'Deactivate' : 'Activate'}
                        </button>
                        {member.orderCount === 0 && (
                          <button
                            onClick={() => handleDeleteStaff(member.id)}
                            className="text-red-600 hover:text-red-800"
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Back Link */}
        <div className="mt-6">
          <Link href="/admin" className="text-sm text-gray-500 hover:text-gray-700">
            ← Back to Admin
          </Link>
        </div>
      </div>
    </div>
  )
}
