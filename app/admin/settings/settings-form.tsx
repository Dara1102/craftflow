'use client'

import { useState } from 'react'
import { updateSetting } from '@/app/actions/admin'

interface Props {
  initialSettings: Record<string, string>
}

// Default slice sizes for reference
const DEFAULT_SLICE_SIZES = {
  wedding: { widthCm: 2.5, depthCm: 5 },
  party: { widthCm: 5, depthCm: 5 },
  generous: { widthCm: 5, depthCm: 7.5 },
}

export default function SettingsForm({ initialSettings }: Props) {
  const [laborRate, setLaborRate] = useState(initialSettings.LaborRatePerHour || '25')
  const [markupPercent, setMarkupPercent] = useState(
    ((parseFloat(initialSettings.MarkupPercent || '0.7') * 100).toString())
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

  const [isSaving, setIsSaving] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)

    // Save business settings
    await updateSetting('LaborRatePerHour', laborRate)
    await updateSetting('MarkupPercent', (parseFloat(markupPercent) / 100).toString())

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