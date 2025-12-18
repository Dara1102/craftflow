'use client'

import { useState } from 'react'
import { updateSetting, createDeliveryStartPoint, updateDeliveryStartPoint, deleteDeliveryStartPoint, setDefaultDeliveryStartPoint } from '@/app/actions/admin'

interface DeliveryStartPoint {
  id: number
  name: string
  address: string
  latitude: number | null
  longitude: number | null
  isDefault: boolean
  isActive: boolean
  sortOrder: number
}

interface Props {
  initialSettings: Record<string, string>
  initialStartPoints: DeliveryStartPoint[]
}

// Default slice sizes for reference
const DEFAULT_SLICE_SIZES = {
  wedding: { widthCm: 2.5, depthCm: 5 },
  party: { widthCm: 5, depthCm: 5 },
  generous: { widthCm: 5, depthCm: 7.5 },
}

// Default quote policy
const DEFAULT_QUOTE_POLICY = `**Quote Terms & Conditions**

1. **Validity**: This quote is valid for 30 days from the date of issue.

2. **Deposit**: A 50% non-refundable deposit is required to confirm your order. The remaining balance is due 7 days before the event date.

3. **Changes**: Order changes may be made up to 14 days before the event date. Changes made after this time may incur additional fees or may not be possible.

4. **Cancellation**:
   - More than 30 days before event: Full deposit refund minus $50 administrative fee
   - 14-30 days before event: 50% deposit refund
   - Less than 14 days before event: No refund

5. **Delivery**: Delivery fees are non-refundable. We are not responsible for damage caused by third-party handling after delivery.

6. **Allergies**: Please inform us of any allergies. While we take precautions, our kitchen handles nuts, dairy, eggs, and gluten.

7. **Images**: Design images are for reference only. Final cake may vary slightly due to the handcrafted nature of our work.

8. **Storage**: Cakes should be stored in a cool, dry place and consumed within 3 days of delivery.`

export default function SettingsForm({ initialSettings, initialStartPoints }: Props) {
  const [laborRate, setLaborRate] = useState(initialSettings.LaborRatePerHour || '25')
  const [markupPercent, setMarkupPercent] = useState(
    ((parseFloat(initialSettings.MarkupPercent || '0.7') * 100).toString())
  )
  const [quotePolicy, setQuotePolicy] = useState(
    initialSettings.QuotePolicy || DEFAULT_QUOTE_POLICY
  )
  const [defaultDepositPercent, setDefaultDepositPercent] = useState(
    ((parseFloat(initialSettings.DefaultDepositPercent || '0.5') * 100).toString())
  )

  // Slice size settings
  const [weddingWidth, setWeddingWidth] = useState(
    initialSettings.SliceWeddingWidthCm || DEFAULT_SLICE_SIZES.wedding.widthCm.toString()
  )
  const [weddingDepth, setWeddingDepth] = useState(
    initialSettings.SliceWeddingDepthCm || DEFAULT_SLICE_SIZES.wedding.depthCm.toString()
  )
  const [partyWidth, setPartyWidth] = useState(
    initialSettings.SlicePartyWidthCm || DEFAULT_SLICE_SIZES.party.widthCm.toString()
  )
  const [partyDepth, setPartyDepth] = useState(
    initialSettings.SlicePartyDepthCm || DEFAULT_SLICE_SIZES.party.depthCm.toString()
  )
  const [generousWidth, setGenerousWidth] = useState(
    initialSettings.SliceGenerousWidthCm || DEFAULT_SLICE_SIZES.generous.widthCm.toString()
  )
  const [generousDepth, setGenerousDepth] = useState(
    initialSettings.SliceGenerousDepthCm || DEFAULT_SLICE_SIZES.generous.depthCm.toString()
  )

  // Delivery start points
  const [startPoints, setStartPoints] = useState<DeliveryStartPoint[]>(initialStartPoints)
  const [showNewStartPointForm, setShowNewStartPointForm] = useState(false)
  const [newStartPointName, setNewStartPointName] = useState('')
  const [newStartPointAddress, setNewStartPointAddress] = useState('')
  const [editingStartPointId, setEditingStartPointId] = useState<number | null>(null)
  const [editingName, setEditingName] = useState('')
  const [editingAddress, setEditingAddress] = useState('')

  const [isSaving, setIsSaving] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)

    // Save business settings
    await updateSetting('LaborRatePerHour', laborRate)
    await updateSetting('MarkupPercent', (parseFloat(markupPercent) / 100).toString())
    await updateSetting('QuotePolicy', quotePolicy)
    await updateSetting('DefaultDepositPercent', (parseFloat(defaultDepositPercent) / 100).toString())

    // Save slice size settings
    await updateSetting('SliceWeddingWidthCm', weddingWidth)
    await updateSetting('SliceWeddingDepthCm', weddingDepth)
    await updateSetting('SlicePartyWidthCm', partyWidth)
    await updateSetting('SlicePartyDepthCm', partyDepth)
    await updateSetting('SliceGenerousWidthCm', generousWidth)
    await updateSetting('SliceGenerousDepthCm', generousDepth)

    setIsSaving(false)
    alert('Settings saved successfully!')
  }

  const resetSliceSizes = () => {
    setWeddingWidth(DEFAULT_SLICE_SIZES.wedding.widthCm.toString())
    setWeddingDepth(DEFAULT_SLICE_SIZES.wedding.depthCm.toString())
    setPartyWidth(DEFAULT_SLICE_SIZES.party.widthCm.toString())
    setPartyDepth(DEFAULT_SLICE_SIZES.party.depthCm.toString())
    setGenerousWidth(DEFAULT_SLICE_SIZES.generous.widthCm.toString())
    setGenerousDepth(DEFAULT_SLICE_SIZES.generous.depthCm.toString())
  }

  // Convert cm to inches for display
  const cmToInches = (cm: string) => {
    const val = parseFloat(cm)
    if (isNaN(val)) return '—'
    return (val / 2.54).toFixed(1)
  }

  // Delivery start point handlers
  const handleAddStartPoint = async () => {
    if (!newStartPointName.trim() || !newStartPointAddress.trim()) return

    const result = await createDeliveryStartPoint({
      name: newStartPointName.trim(),
      address: newStartPointAddress.trim(),
      isDefault: startPoints.length === 0,
    })

    if (result) {
      setStartPoints([...startPoints, {
        ...result,
        latitude: result.latitude ? Number(result.latitude) : null,
        longitude: result.longitude ? Number(result.longitude) : null,
      }])
      setNewStartPointName('')
      setNewStartPointAddress('')
      setShowNewStartPointForm(false)
    }
  }

  const handleUpdateStartPoint = async (id: number) => {
    if (!editingName.trim() || !editingAddress.trim()) return

    await updateDeliveryStartPoint(id, {
      name: editingName.trim(),
      address: editingAddress.trim(),
    })

    setStartPoints(startPoints.map(sp =>
      sp.id === id ? { ...sp, name: editingName.trim(), address: editingAddress.trim() } : sp
    ))
    setEditingStartPointId(null)
  }

  const handleDeleteStartPoint = async (id: number) => {
    if (!confirm('Delete this delivery start point?')) return

    await deleteDeliveryStartPoint(id)
    setStartPoints(startPoints.filter(sp => sp.id !== id))
  }

  const handleSetDefault = async (id: number) => {
    await setDefaultDeliveryStartPoint(id)
    setStartPoints(startPoints.map(sp => ({
      ...sp,
      isDefault: sp.id === id
    })))
  }

  const startEditingStartPoint = (sp: DeliveryStartPoint) => {
    setEditingStartPointId(sp.id)
    setEditingName(sp.name)
    setEditingAddress(sp.address)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-white shadow px-4 py-5 sm:rounded-lg sm:p-6">
        <div className="md:grid md:grid-cols-3 md:gap-6">
          <div className="md:col-span-1">
            <h3 className="text-lg font-medium leading-6 text-gray-900">Business Settings</h3>
            <p className="mt-1 text-sm text-gray-600">
              Configure your business pricing and labor rates.
            </p>
          </div>
          <div className="mt-5 md:mt-0 md:col-span-2">
            <div className="grid grid-cols-6 gap-6">
              <div className="col-span-6 sm:col-span-3">
                <label htmlFor="laborRate" className="block text-sm font-medium text-gray-700">
                  Labor Rate per Hour ($)
                </label>
                <input
                  type="number"
                  name="laborRate"
                  id="laborRate"
                  step="0.01"
                  min="0"
                  value={laborRate}
                  onChange={(e) => setLaborRate(e.target.value)}
                  className="mt-1 focus:ring-pink-500 focus:border-pink-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                />
                <p className="mt-2 text-sm text-gray-500">
                  The hourly rate charged for labor.
                </p>
              </div>

              <div className="col-span-6 sm:col-span-3">
                <label htmlFor="markupPercent" className="block text-sm font-medium text-gray-700">
                  Markup Percentage (%)
                </label>
                <input
                  type="number"
                  name="markupPercent"
                  id="markupPercent"
                  step="1"
                  min="0"
                  value={markupPercent}
                  onChange={(e) => setMarkupPercent(e.target.value)}
                  className="mt-1 focus:ring-pink-500 focus:border-pink-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                />
                <p className="mt-2 text-sm text-gray-500">
                  The markup percentage applied to total costs.
                </p>
              </div>

              <div className="col-span-6 sm:col-span-3">
                <label htmlFor="depositPercent" className="block text-sm font-medium text-gray-700">
                  Default Deposit (%)
                </label>
                <input
                  type="number"
                  name="depositPercent"
                  id="depositPercent"
                  step="5"
                  min="0"
                  max="100"
                  value={defaultDepositPercent}
                  onChange={(e) => setDefaultDepositPercent(e.target.value)}
                  className="mt-1 focus:ring-pink-500 focus:border-pink-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                />
                <p className="mt-2 text-sm text-gray-500">
                  Default deposit required on quotes. Can be overridden per quote.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quote Policy Settings */}
      <div className="bg-white shadow px-4 py-5 sm:rounded-lg sm:p-6">
        <div className="md:grid md:grid-cols-3 md:gap-6">
          <div className="md:col-span-1">
            <h3 className="text-lg font-medium leading-6 text-gray-900">Quote Policy</h3>
            <p className="mt-1 text-sm text-gray-600">
              Default terms and conditions shown on customer quotes.
            </p>
            <button
              type="button"
              onClick={() => setQuotePolicy(DEFAULT_QUOTE_POLICY)}
              className="mt-3 text-sm text-pink-600 hover:text-pink-800 underline"
            >
              Reset to default
            </button>
          </div>
          <div className="mt-5 md:mt-0 md:col-span-2">
            <div>
              <label htmlFor="quotePolicy" className="block text-sm font-medium text-gray-700">
                Terms & Conditions
              </label>
              <p className="text-xs text-gray-500 mb-2">
                Use **text** for bold formatting. Each quote can override this default.
              </p>
              <textarea
                id="quotePolicy"
                name="quotePolicy"
                rows={16}
                value={quotePolicy}
                onChange={(e) => setQuotePolicy(e.target.value)}
                className="mt-1 shadow-sm focus:ring-pink-500 focus:border-pink-500 block w-full sm:text-sm border-gray-300 rounded-md font-mono"
                placeholder="Enter your quote terms and conditions..."
              />
            </div>
          </div>
        </div>
      </div>

      {/* Slice Size Settings */}
      <div className="bg-white shadow px-4 py-5 sm:rounded-lg sm:p-6">
        <div className="md:grid md:grid-cols-3 md:gap-6">
          <div className="md:col-span-1">
            <h3 className="text-lg font-medium leading-6 text-gray-900">Cake Slice Sizes</h3>
            <p className="mt-1 text-sm text-gray-600">
              Configure standard slice sizes used for calculating servings from tier dimensions.
            </p>
            <button
              type="button"
              onClick={resetSliceSizes}
              className="mt-3 text-sm text-pink-600 hover:text-pink-800 underline"
            >
              Reset to defaults
            </button>
          </div>
          <div className="mt-5 md:mt-0 md:col-span-2">
            <div className="space-y-6">
              {/* Wedding Slice */}
              <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
                <h4 className="text-sm font-medium text-gray-900 mb-1">Wedding Slice</h4>
                <p className="text-xs text-gray-500 mb-3">Tall, thin slices - standard for weddings and formal events</p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-600">Width (cm)</label>
                    <input
                      type="number"
                      step="0.1"
                      min="0.5"
                      value={weddingWidth}
                      onChange={(e) => setWeddingWidth(e.target.value)}
                      className="mt-1 block w-full py-2 px-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-pink-500 focus:border-pink-500 sm:text-sm"
                    />
                    <p className="mt-1 text-xs text-gray-400">≈ {cmToInches(weddingWidth)}"</p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600">Depth (cm)</label>
                    <input
                      type="number"
                      step="0.1"
                      min="0.5"
                      value={weddingDepth}
                      onChange={(e) => setWeddingDepth(e.target.value)}
                      className="mt-1 block w-full py-2 px-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-pink-500 focus:border-pink-500 sm:text-sm"
                    />
                    <p className="mt-1 text-xs text-gray-400">≈ {cmToInches(weddingDepth)}"</p>
                  </div>
                </div>
              </div>

              {/* Party Slice */}
              <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                <h4 className="text-sm font-medium text-gray-900 mb-1">Party Slice</h4>
                <p className="text-xs text-gray-500 mb-3">Square slices - standard for birthday parties and casual events</p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-600">Width (cm)</label>
                    <input
                      type="number"
                      step="0.1"
                      min="0.5"
                      value={partyWidth}
                      onChange={(e) => setPartyWidth(e.target.value)}
                      className="mt-1 block w-full py-2 px-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-pink-500 focus:border-pink-500 sm:text-sm"
                    />
                    <p className="mt-1 text-xs text-gray-400">≈ {cmToInches(partyWidth)}"</p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600">Depth (cm)</label>
                    <input
                      type="number"
                      step="0.1"
                      min="0.5"
                      value={partyDepth}
                      onChange={(e) => setPartyDepth(e.target.value)}
                      className="mt-1 block w-full py-2 px-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-pink-500 focus:border-pink-500 sm:text-sm"
                    />
                    <p className="mt-1 text-xs text-gray-400">≈ {cmToInches(partyDepth)}"</p>
                  </div>
                </div>
              </div>

              {/* Generous Slice */}
              <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                <h4 className="text-sm font-medium text-gray-900 mb-1">Generous Slice</h4>
                <p className="text-xs text-gray-500 mb-3">Larger slices - dessert portions for smaller gatherings</p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-600">Width (cm)</label>
                    <input
                      type="number"
                      step="0.1"
                      min="0.5"
                      value={generousWidth}
                      onChange={(e) => setGenerousWidth(e.target.value)}
                      className="mt-1 block w-full py-2 px-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-pink-500 focus:border-pink-500 sm:text-sm"
                    />
                    <p className="mt-1 text-xs text-gray-400">≈ {cmToInches(generousWidth)}"</p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600">Depth (cm)</label>
                    <input
                      type="number"
                      step="0.1"
                      min="0.5"
                      value={generousDepth}
                      onChange={(e) => setGenerousDepth(e.target.value)}
                      className="mt-1 block w-full py-2 px-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-pink-500 focus:border-pink-500 sm:text-sm"
                    />
                    <p className="mt-1 text-xs text-gray-400">≈ {cmToInches(generousDepth)}"</p>
                  </div>
                </div>
              </div>

              {/* Visual Reference */}
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <h4 className="text-sm font-medium text-gray-900 mb-2">Slice Size Reference</h4>
                <div className="text-xs text-gray-600 space-y-1">
                  <p><strong>Wedding ({cmToInches(weddingWidth)}" × {cmToInches(weddingDepth)}"):</strong> {weddingWidth}cm × {weddingDepth}cm = {(parseFloat(weddingWidth) * parseFloat(weddingDepth)).toFixed(1)} cm² per slice</p>
                  <p><strong>Party ({cmToInches(partyWidth)}" × {cmToInches(partyDepth)}"):</strong> {partyWidth}cm × {partyDepth}cm = {(parseFloat(partyWidth) * parseFloat(partyDepth)).toFixed(1)} cm² per slice</p>
                  <p><strong>Generous ({cmToInches(generousWidth)}" × {cmToInches(generousDepth)}"):</strong> {generousWidth}cm × {generousDepth}cm = {(parseFloat(generousWidth) * parseFloat(generousDepth)).toFixed(1)} cm² per slice</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Delivery Start Points */}
      <div className="bg-white shadow px-4 py-5 sm:rounded-lg sm:p-6">
        <div className="md:grid md:grid-cols-3 md:gap-6">
          <div className="md:col-span-1">
            <h3 className="text-lg font-medium leading-6 text-gray-900">Delivery Start Points</h3>
            <p className="mt-1 text-sm text-gray-600">
              Locations where deliveries start from (office, warehouse, home kitchen, etc.)
            </p>
          </div>
          <div className="mt-5 md:mt-0 md:col-span-2">
            <div className="space-y-4">
              {/* Existing start points */}
              {startPoints.map((sp) => (
                <div key={sp.id} className={`border rounded-lg p-4 ${sp.isDefault ? 'border-pink-300 bg-pink-50' : 'border-gray-200'}`}>
                  {editingStartPointId === sp.id ? (
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-600">Name</label>
                        <input
                          type="text"
                          value={editingName}
                          onChange={(e) => setEditingName(e.target.value)}
                          className="mt-1 block w-full py-2 px-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-pink-500 focus:border-pink-500 sm:text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600">Address</label>
                        <input
                          type="text"
                          value={editingAddress}
                          onChange={(e) => setEditingAddress(e.target.value)}
                          className="mt-1 block w-full py-2 px-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-pink-500 focus:border-pink-500 sm:text-sm"
                        />
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => handleUpdateStartPoint(sp.id)}
                          className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded text-white bg-pink-600 hover:bg-pink-700"
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingStartPointId(null)}
                          className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-900">{sp.name}</span>
                          {sp.isDefault && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-pink-100 text-pink-800">
                              Default
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-500 mt-1">{sp.address}</p>
                      </div>
                      <div className="flex gap-2">
                        {!sp.isDefault && (
                          <button
                            type="button"
                            onClick={() => handleSetDefault(sp.id)}
                            className="text-xs text-pink-600 hover:text-pink-800"
                          >
                            Set Default
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => startEditingStartPoint(sp)}
                          className="text-xs text-gray-600 hover:text-gray-800"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteStartPoint(sp.id)}
                          className="text-xs text-red-600 hover:text-red-800"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {/* Add new start point form */}
              {showNewStartPointForm ? (
                <div className="border border-gray-300 border-dashed rounded-lg p-4 bg-gray-50 space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600">Name</label>
                    <input
                      type="text"
                      value={newStartPointName}
                      onChange={(e) => setNewStartPointName(e.target.value)}
                      placeholder="e.g., Main Office, Warehouse, Home Kitchen"
                      className="mt-1 block w-full py-2 px-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-pink-500 focus:border-pink-500 sm:text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600">Address</label>
                    <input
                      type="text"
                      value={newStartPointAddress}
                      onChange={(e) => setNewStartPointAddress(e.target.value)}
                      placeholder="Full address for distance calculations"
                      className="mt-1 block w-full py-2 px-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-pink-500 focus:border-pink-500 sm:text-sm"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handleAddStartPoint}
                      className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded text-white bg-pink-600 hover:bg-pink-700"
                    >
                      Add Location
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowNewStartPointForm(false)
                        setNewStartPointName('')
                        setNewStartPointAddress('')
                      }}
                      className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowNewStartPointForm(true)}
                  className="w-full py-3 border-2 border-dashed border-gray-300 rounded-lg text-sm text-gray-500 hover:border-pink-400 hover:text-pink-600 transition-colors"
                >
                  + Add Delivery Start Point
                </button>
              )}

              {startPoints.length === 0 && !showNewStartPointForm && (
                <p className="text-sm text-gray-500 text-center py-4">
                  No delivery start points configured. Add your office or warehouse location to enable automatic distance calculations.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={isSaving}
          className="ml-3 inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-pink-600 hover:bg-pink-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-500 disabled:opacity-50"
        >
          {isSaving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>
    </form>
  )
}