import React, { useState, useEffect, useRef } from 'react';
import { Plus, Wine } from 'lucide-react';
import { batchAPI } from './api';

const stabilizationTypes = {
    pasteurized: 'Pasteurization',
    chemical_stabilization: 'Chemical Stabilization'
}

const packageTypes = {
    bottled: 'Bottled',
    kegged: 'Kegged'
}

// Utility functions for calculations
const calculateABV = (og, fg) => {
    return ((og - fg) * 131.25).toFixed(2);
};

const calculateTOSNA3Schedule = (carboySizeGal, honeyLbs, og) => {
    const baseAmount = carboySizeGal;
    const gravityFactor = og > 1.100 ? 1.2 : 1.0;
    const amountPerAddition = (baseAmount * gravityFactor).toFixed(2);

    return [
        { hours: 24, amount: amountPerAddition },
        { hours: 48, amount: amountPerAddition },
        { hours: 72, amount: amountPerAddition }
    ];
};

const calculateStabilizers = (carboySizeGal) => {
    return {
        kMeta: (carboySizeGal * 0.5).toFixed(2),
        kSorbate: (carboySizeGal * 0.75).toFixed(2)
    };
};

const BatchCard = ({ batch, onClick }) => {
    const getStatusBadge = () => {
        if (batch.packageDate) {
            return <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs font-medium">Finished</span>;
        }
        if (batch.backsweetenDate) {
            return <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded text-xs font-medium">Backsweetened</span>;
        }
        if (batch.stabilizationDate) {
            return <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-medium">Stabilized</span>;
        }
        if (batch.originalGravity) {
            return <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-xs font-medium">Fermenting</span>;
        }
        return <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded text-xs font-medium">Started</span>;
    };

    return (
        <div onClick={onClick} className="bg-white border rounded-lg p-4 cursor-pointer hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-3">
                <div>
                    <h3 className="font-semibold text-lg">{batch.name}</h3>
                    <p className="text-sm text-gray-500">{new Date(batch.startDate).toLocaleDateString()}</p>
                </div>
                {getStatusBadge()}
            </div>

            <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                    <span className="text-gray-600">Size:</span> {batch.carboySizeGal} gal
                </div>
                <div>
                    <span className="text-gray-600">Honey:</span> {batch.honeyLbs} lbs
                </div>
                {batch.backsweeteningSG && (
                    <div>
                        <span className="text-gray-600">Specific Gravity:</span> {batch.backsweeteningSG.toFixed(3)}
                    </div>
                )}
                {batch.finalGravity && batch.abv && (
                    <div>
                        <span className="text-gray-600">ABV:</span> {batch.abv}%
                    </div>
                )}
            </div>

            {batch.otherIngredients && (
                <p className="text-sm text-gray-600 mt-2 truncate">
                    <span className="font-medium">Ingredients:</span> {batch.otherIngredients}
                </p>
            )}
        </div>
    );
};

const MeadBatchTracker = () => {
    const [batches, setBatches] = useState([]);
    const [displayedBatches, setDisplayedBatches] = useState([]);
    const [selectedBatch, setSelectedBatch] = useState(null);
    const [showNewBatchForm, setShowNewBatchForm] = useState(false);
    const [displayCount, setDisplayCount] = useState(10);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const observerTarget = useRef(null);

    useEffect(() => {
        loadBatches();
    }, []);

    const loadBatches = async () => {
        try {
            setLoading(true);
            setError(null);
            const data = await batchAPI.getAllBatches();
            setBatches(data);
            setDisplayedBatches(data.slice(0, 10));
        } catch (err) {
            console.error('Error loading batches:', err);
            setError('Failed to load batches. Make sure the server is running.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        setDisplayedBatches(batches.slice(0, displayCount));
    }, [batches, displayCount]);

    useEffect(() => {
        const observer = new IntersectionObserver(
            entries => {
                if (entries[0].isIntersecting && displayCount < batches.length) {
                    setDisplayCount(prev => Math.min(prev + 10, batches.length));
                }
            },
            { threshold: 1 }
        );

        if (observerTarget.current) {
            observer.observe(observerTarget.current);
        }

        return () => observer.disconnect();
    }, [displayCount, batches.length]);

    const addBatch = async (batchData) => {
        try {
            const newBatch = {
                ...batchData,
                startDate: new Date().toISOString(),
                gravityReadings: []
            };
            await batchAPI.createBatch(newBatch);
            setBatches([newBatch, ...batches]);
            setShowNewBatchForm(false);
        } catch (err) {
            console.error('Error adding batch:', err);
            setError('Failed to create batch');
        }
    };

    const updateBatch = async (batchId, updates) => {
        try {
            const batchToUpdate = batches.find(b => b.id === batchId);
            const updatedBatch = { ...batchToUpdate, ...updates };
            await batchAPI.updateBatch(batchId, updatedBatch);
            setBatches(batches.map(b => b.id === batchId ? updatedBatch : b));
            if (selectedBatch?.id === batchId) {
                setSelectedBatch(updatedBatch);
            }
        } catch (err) {
            console.error('Error updating batch:', err);
            setError('Failed to update batch');
        }
    };

    if (showNewBatchForm) {
        return <NewBatchForm onSave={addBatch} onCancel={() => setShowNewBatchForm(false)} />;
    }

    if (selectedBatch) {
        return <BatchDetail batch={selectedBatch} onBack={() => setSelectedBatch(null)} onUpdate={updateBatch} />;
    }

    return (
        <div className="min-h-screen bg-gray-50 p-4">
            <div className="max-w-4xl mx-auto">
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-3xl font-bold text-gray-800">Mead Batches</h1>
                    <button
                        onClick={() => setShowNewBatchForm(true)}
                        className="bg-amber-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-amber-700"
                    >
                        <Plus size={20} /> New Batch
                    </button>
                </div>

                {error && (
                    <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
                        {error}
                    </div>
                )}

                {loading ? (
                    <div className="text-center py-12 text-gray-500">
                        <p>Loading batches...</p>
                    </div>
                ) : displayedBatches.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                        <Wine size={48} className="mx-auto mb-4 opacity-50" />
                        <p>No batches yet. Start your first batch!</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {displayedBatches.map(batch => (
                            <BatchCard key={batch.id} batch={batch} onClick={() => setSelectedBatch(batch)} />
                        ))}
                        {displayCount < batches.length && (
                            <div ref={observerTarget} className="text-center py-4 text-gray-500">
                                Loading more...
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

const NewBatchForm = ({ onSave, onCancel }) => {
    const id = Date.now()
    const [formData, setFormData] = useState({
        id: id,
        name: 'Batch #' + id,
        carboySizeGal: 1,
        honeyLbs: '',
        otherIngredients: '',
        yeast: ''
    });

    const handleSubmit = () => {
        if (formData.honeyLbs && formData.carboySizeGal && formData.name) {
            onSave({
                ...formData,
                honeyLbs: parseFloat(formData.honeyLbs),
                carboySizeGal: parseFloat(formData.carboySizeGal)
            });
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 p-4">
            <div className="max-w-2xl mx-auto bg-white rounded-lg shadow p-6">
                <h2 className="text-2xl font-bold mb-6">New Batch</h2>
                <div>
                    <label className="block text-sm font-medium mb-1">Name</label>
                    <textarea
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full border rounded px-3 py-2"
                        rows="1"
                        placeholder="short name"
                    />
                </div>
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium mb-1">Carboy Size (gallons)</label>
                        <select
                            value={formData.carboySizeGal}
                            onChange={(e) => setFormData({ ...formData, carboySizeGal: e.target.value })}
                            className="w-full border rounded px-3 py-2"
                        >
                            <option value="1">1 gallon</option>
                            <option value="1.5">1.5 gallons</option>
                            <option value="2">2 gallons</option>
                            <option value="3">3 gallons</option>
                            <option value="5">5 gallons</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1">Honey (lbs)</label>
                        <input
                            type="number"
                            step="0.1"
                            value={formData.honeyLbs}
                            onChange={(e) => setFormData({ ...formData, honeyLbs: e.target.value })}
                            className="w-full border rounded px-3 py-2"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1">Other Ingredients (optional)</label>
                        <textarea
                            value={formData.otherIngredients}
                            onChange={(e) => setFormData({ ...formData, otherIngredients: e.target.value })}
                            className="w-full border rounded px-3 py-2"
                            rows="3"
                            placeholder="e.g., 2 lbs blueberries, vanilla bean, oak cubes"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1">Yeast</label>
                        <select
                            value={formData.yeast}
                            onChange={(e) => setFormData({ ...formData, yeast: e.target.value })}
                            className="w-full border rounded px-3 py-2"
                        >
                            <option value="">Unknown</option>
                            <option value="D47">D47</option>
                            <option value="EC-1118">EC-1118</option>
                            <option value="71B">71B</option>
                        </select>
                    </div>

                    <div className="flex gap-3">
                        <button onClick={handleSubmit} className="flex-1 bg-amber-600 text-white py-2 rounded hover:bg-amber-700">
                            Start Batch
                        </button>
                        <button onClick={onCancel} className="flex-1 bg-gray-300 text-gray-700 py-2 rounded hover:bg-gray-400">
                            Cancel
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

const BatchDetail = ({ batch, onBack, onUpdate }) => {
    const [showOGForm, setShowOGForm] = useState(false);
    const [showGravityForm, setShowGravityForm] = useState(false);
    const [showFGForm, setShowFGForm] = useState(false);
    const [showStabilizationForm, setShowStabilizationForm] = useState(false);
    const [showBacksweetenForm, setShowBacksweetenForm] = useState(false);
    const [showBottleForm, setShowBottleForm] = useState(false);

    const [ogValue, setOgValue] = useState('');
    const [gravityValue, setGravityValue] = useState('');
    const [fgValue, setFgValue] = useState('');
    const [stabilizationType, setStabilizationType] = useState('pasteurized');
    const [backsweetAmount, setBacksweetAmount] = useState('');
    const [backsweetSG, setBacksweetSG] = useState('');
    const [packageType, setPackageType] = useState('bottled');
    const [otherBacksweetenIngredients, setOtherBacksweetenIngredients] = useState('');

    const handleAddOG = () => {
        const og = parseFloat(ogValue);
        const schedule = calculateTOSNA3Schedule(batch.carboySizeGal, batch.honeyLbs, og);
        onUpdate(batch.id, {
            originalGravity: og,
            ogDate: new Date().toISOString(),
            tosnaSchedule: schedule
        });
        setShowOGForm(false);
        setOgValue('');
    };

    const handleAddGravity = () => {
        const newReading = {
            date: new Date().toISOString(),
            gravity: parseFloat(gravityValue)
        };
        onUpdate(batch.id, {
            gravityReadings: [...(batch.gravityReadings || []), newReading]
        });
        setShowGravityForm(false);
        setGravityValue('');
    };

    const handleAddFG = () => {
        const fg = parseFloat(fgValue);
        const abv = calculateABV(batch.originalGravity, fg);
        const stabilizers = calculateStabilizers(batch.carboySizeGal);
        onUpdate(batch.id, {
            finalGravity: fg,
            fgDate: new Date().toISOString(),
            abv: abv,
            stabilizers: stabilizers
        });
        setShowFGForm(false);
        setFgValue('');
    };

    const handleBacksweeten = () => {
        onUpdate(batch.id, {
            backsweetenHoneyLbs: parseFloat(backsweetAmount),
            backsweeteningSG: parseFloat(backsweetSG),
            otherBacksweetenIngredients: otherBacksweetenIngredients,
            backsweetenDate: new Date().toISOString()
        });
        setShowBacksweetenForm(false);
        setBacksweetAmount('');
        setBacksweetSG('');
        setOtherBacksweetenIngredients('')
    };

    const skipBacksweeten = () => {
        onUpdate(batch.id, {
            backsweetenSkipped: true,
            backsweetenDate: new Date().toISOString()
        });
        setShowBacksweetenForm(false);
        setBacksweetAmount('');
        setBacksweetSG('');
    };

    const handlePackage = () => {
        onUpdate(batch.id, {
            packageType: packageType,
            packageDate: new Date().toISOString()
        });
        setShowBottleForm(false);
    };

    const handleStabilization = () => {
        onUpdate(batch.id, {
            stabilizationType: stabilizationType,
            stabilizationDate: new Date().toISOString()
        });
        setShowStabilizationForm(false);
    };

    const skipStabilization = () => {
        onUpdate(batch.id, {
            stabilizationSkipped: true,
            stabilizationDate: new Date().toISOString()
        });
        setShowStabilizationForm(false);
    };

    return (
        <div className="min-h-screen bg-gray-50 p-4">
            <div className="max-w-3xl mx-auto">
                <button onClick={onBack} className="mb-4 text-amber-600 hover:text-amber-700">
                    ← Back to Batches
                </button>

                <div className="bg-white rounded-lg shadow p-6 mb-4">
                    <h2 className="text-2xl font-bold mb-4">{batch.name}</h2>
                    <div className="grid grid-cols-2 gap-4 mb-6">
                        <div>
                            <p className="text-sm text-gray-600">Started</p>
                            <p className="font-medium">{new Date(batch.startDate).toLocaleDateString()}</p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-600">Carboy Size</p>
                            <p className="font-medium">{batch.carboySizeGal} gallons</p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-600">Honey</p>
                            <p className="font-medium">{batch.honeyLbs} lbs</p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-600">Yeast</p>
                            <p className="font-medium">{batch.yeast}</p>
                        </div>
                        {batch.otherIngredients && (
                            <div className="col-span-2">
                                <p className="text-sm text-gray-600">Other Ingredients</p>
                                <p className="font-medium">{batch.otherIngredients}</p>
                            </div>
                        )}
                    </div>

                    {!batch.originalGravity && (
                        <button
                            onClick={() => setShowOGForm(true)}
                            className="w-full bg-amber-600 text-white py-2 rounded hover:bg-amber-700"
                        >
                            Record Original Gravity
                        </button>
                    )}

                    {showOGForm && (
                        <div className="mt-4 p-4 border rounded bg-gray-50">
                            <label className="block text-sm font-medium mb-2">Original Gravity (OG)</label>
                            <input
                                type="number"
                                step="0.001"
                                value={ogValue}
                                onChange={(e) => setOgValue(e.target.value)}
                                placeholder="e.g., 1.120"
                                className="w-full border rounded px-3 py-2 mb-3"
                            />
                            <div className="flex gap-2">
                                <button onClick={handleAddOG} className="flex-1 bg-amber-600 text-white py-2 rounded hover:bg-amber-700">
                                    Save OG
                                </button>
                                <button onClick={() => setShowOGForm(false)} className="flex-1 bg-gray-300 text-gray-700 py-2 rounded hover:bg-gray-400">
                                    Cancel
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {batch.originalGravity && (
                    <div className="bg-white rounded-lg shadow p-6 mb-4">
                        <h3 className="text-xl font-bold mb-4">Fermentation</h3>

                        <div className="mb-4">
                            <p className="text-sm text-gray-600">Original Gravity</p>
                            <p className="font-medium text-lg">{batch.originalGravity.toFixed(3)}</p>
                            <p className="text-xs text-gray-500">{new Date(batch.ogDate).toLocaleDateString()}</p>
                        </div>

                        {batch.tosnaSchedule && (
                            <div className="mb-4 p-3 bg-blue-50 rounded">
                                <h4 className="font-semibold mb-2">TOSNA 3.0 Schedule (Fermaid-O)</h4>
                                {batch.tosnaSchedule.map((addition, idx) => (
                                    <p key={idx} className="text-sm">
                                        At {addition.hours}h: <span className="font-medium">{addition.amount}g</span>
                                    </p>
                                ))}
                            </div>
                        )}

                        {batch.gravityReadings && batch.gravityReadings.length > 0 && (
                            <div className="mb-4">
                                <h4 className="font-semibold mb-2">Gravity Readings</h4>
                                {batch.gravityReadings.map((reading, idx) => (
                                    <p key={idx} className="text-sm">
                                        {new Date(reading.date).toLocaleDateString()}: {reading.gravity.toFixed(3)}
                                    </p>
                                ))}
                            </div>
                        )}

                        {!batch.finalGravity && (
                            <>
                                <button
                                    onClick={() => setShowGravityForm(true)}
                                    className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 mb-2"
                                >
                                    Add Gravity Reading
                                </button>

                                <button
                                    onClick={() => setShowFGForm(true)}
                                    className="w-full bg-green-600 text-white py-2 rounded hover:bg-green-700"
                                >
                                    Record Final Gravity
                                </button>
                            </>
                        )}

                        {showGravityForm && (
                            <div className="mt-4 p-4 border rounded bg-gray-50">
                                <label className="block text-sm font-medium mb-2">Gravity Reading</label>
                                <input
                                    type="number"
                                    step="0.001"
                                    value={gravityValue}
                                    onChange={(e) => setGravityValue(e.target.value)}
                                    placeholder="e.g., 1.050"
                                    className="w-full border rounded px-3 py-2 mb-3"
                                />
                                <div className="flex gap-2">
                                    <button onClick={handleAddGravity} className="flex-1 bg-blue-600 text-white py-2 rounded hover:bg-blue-700">
                                        Add Reading
                                    </button>
                                    <button onClick={() => setShowGravityForm(false)} className="flex-1 bg-gray-300 text-gray-700 py-2 rounded hover:bg-gray-400">
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        )}

                        {showFGForm && (
                            <div className="mt-4 p-4 border rounded bg-gray-50">
                                <label className="block text-sm font-medium mb-2">Final Gravity (FG)</label>
                                <input
                                    type="number"
                                    step="0.001"
                                    value={fgValue}
                                    onChange={(e) => setFgValue(e.target.value)}
                                    placeholder="e.g., 1.000"
                                    className="w-full border rounded px-3 py-2 mb-3"
                                />
                                <div className="flex gap-2">
                                    <button onClick={handleAddFG} className="flex-1 bg-green-600 text-white py-2 rounded hover:bg-green-700">
                                        Save FG
                                    </button>
                                    <button onClick={() => setShowFGForm(false)} className="flex-1 bg-gray-300 text-gray-700 py-2 rounded hover:bg-gray-400">
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        )}

                        {batch.finalGravity && (
                            <div className="grid grid-cols-2 gap-4 mb-4">
                                <div>
                                    <p className="text-sm text-gray-600">Final Gravity</p>
                                    <p className="font-medium">{batch.finalGravity.toFixed(3)}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-600">ABV</p>
                                    <p className="font-medium">{batch.abv}%</p>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {batch.finalGravity && (
                    <div className="bg-white rounded-lg shadow p-6 mb-4">
                        <h3 className="text-xl font-bold mb-4">Stabilization</h3>

                        {batch.stabilizers && (
                            <div className="p-3 bg-purple-50 rounded mb-4">
                                <h4 className="font-semibold mb-2">Stabilizers Needed</h4>
                                <p className="text-sm">Potassium Metabisulfite: <span className="font-medium">{batch.stabilizers.kMeta}g</span></p>
                                <p className="text-sm">Potassium Sorbate: <span className="font-medium">{batch.stabilizers.kSorbate}g</span></p>
                            </div>
                        )}
                        {batch.stabilizationDate && (
                            <div className="mb-4">
                                <p className="text-sm text-gray-600">Stabilization Type</p>
                                <p className="font-medium text-lg">{stabilizationTypes[batch.stabilizationType]}</p>
                                <p className="text-xs text-gray-500">{new Date(batch.stabilizationDate).toLocaleDateString()}</p>
                            </div>
                        )}
                        {batch.stabilizationSkipped && (
                            <div className="mb-4">
                                <p className="font-medium text-lg">Skipped</p>
                            </div>
                        )}

                        {!batch.stabilizationDate && (
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setShowStabilizationForm(true)}
                                    className="flex-1 bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
                                >
                                    Stabilize
                                </button>

                                <button
                                    onClick={() => skipStabilization()}
                                    className="flex-1 bg-green-600 text-white py-2 rounded hover:bg-green-700"
                                >
                                    Skip Stabilization
                                </button>
                            </div>
                        )}

                        {showStabilizationForm && (
                            <div className="mt-4 p-4 border rounded bg-gray-50">
                                <label className="block text-sm font-medium mb-2">Stabilization Type</label>
                                <select
                                    value={stabilizationType}
                                    onChange={(e) => setStabilizationType(e.target.value)}
                                    className="w-full border rounded px-3 py-2 mb-3"
                                >
                                    <option value="pasteurized">Pasteurization</option>
                                    <option value="chemical_stabilization">Chemical Stabilization</option>
                                </select>
                                <div className="flex gap-2">
                                    <button onClick={handleStabilization} className="flex-1 bg-amber-600 text-white py-2 rounded hover:bg-amber-700">
                                        Confirm
                                    </button>
                                    <button onClick={() => setShowStabilizationForm(false)} className="flex-1 bg-gray-300 text-gray-700 py-2 rounded hover:bg-gray-400">
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {batch.stabilizationDate && (
                    <div className="bg-white rounded-lg shadow p-6 mb-4">
                        <h3 className="text-xl font-bold mb-4">Backsweetening</h3>
                        {batch.backsweetenSkipped && (
                            <p className="font-medium text-lg">Skipped</p>
                        )}
                        {batch.backsweetenDate && !batch.backsweetenSkipped && (
                            <div>
                                <p className="text-sm">Honey Added: <span className="font-medium">{batch.backsweetenHoneyLbs} lbs</span></p>
                                {batch.otherBacksweetenIngredients && (
                                    <div className="col-span-2">
                                        <p className="text-sm text-gray-600">Other Ingredients</p>
                                        <p className="font-medium">{batch.otherBacksweetenIngredients}</p>
                                    </div>
                                )}
                                <p className="text-sm mb-4">Final SG: <span className="font-medium">{batch.backsweeteningSG.toFixed(3)}</span></p>
                            </div>
                        )}

                        {!batch.backsweetenDate && (
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setShowBacksweetenForm(true)}
                                    className="flex-1 bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
                                >
                                    Backsweeten
                                </button>
                                <button
                                    onClick={skipBacksweeten}
                                    className="flex-1 bg-green-600 text-white py-2 rounded hover:bg-green-700"
                                >
                                    Skip Backsweetening
                                </button>
                            </div>
                        )}

                        {showBacksweetenForm && (
                            <div className="mt-4 p-4 border rounded bg-gray-50">
                                <label className="block text-sm font-medium mb-2">Honey Added (lbs)</label>
                                <input
                                    type="number"
                                    step="0.1"
                                    value={backsweetAmount}
                                    onChange={(e) => setBacksweetAmount(e.target.value)}
                                    className="w-full border rounded px-3 py-2 mb-3"
                                />
                                <div>
                                    <label className="block text-sm font-medium mb-1">Other Ingredients (optional)</label>
                                    <textarea
                                        value={otherBacksweetenIngredients}
                                        onChange={(e) => setOtherBacksweetenIngredients(e.target.value)}
                                        className="w-full border rounded px-3 py-2"
                                        rows="3"
                                        placeholder="e.g., 2 lbs blueberries, vanilla bean, oak cubes"
                                    />
                                </div>
                                <label className="block text-sm font-medium mb-2">Specific Gravity After</label>
                                <input
                                    type="number"
                                    step="0.001"
                                    value={backsweetSG}
                                    onChange={(e) => setBacksweetSG(e.target.value)}
                                    placeholder="e.g., 1.015"
                                    className="w-full border rounded px-3 py-2 mb-3"
                                />
                                <div className="flex gap-2">
                                    <button onClick={handleBacksweeten} className="flex-1 bg-purple-600 text-white py-2 rounded hover:bg-purple-700">
                                        Save
                                    </button>
                                    <button onClick={() => setShowBacksweetenForm(false)} className="flex-1 bg-gray-300 text-gray-700 py-2 rounded hover:bg-gray-400">
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {batch.backsweetenDate && !batch.packageDate && (
                    <div className="bg-white rounded-lg shadow p-6 mb-4">
                        <button
                            onClick={() => setShowBottleForm(true)}
                            className="w-full bg-amber-600 text-white py-2 rounded hover:bg-amber-700"
                        >
                            Bottle/Keg
                        </button>
                    </div>
                )}

                {showBottleForm && (
                    <div className="bg-white rounded-lg shadow p-6 mb-4">
                        <div className="p-4 border rounded bg-gray-50">
                            <label className="block text-sm font-medium mb-2">Package Type</label>
                            <select
                                value={packageType}
                                onChange={(e) => setPackageType(e.target.value)}
                                className="w-full border rounded px-3 py-2 mb-3"
                            >
                                <option value="bottled">Bottled</option>
                                <option value="kegged">Kegged</option>
                            </select>
                            <div className="flex gap-2">
                                <button onClick={handlePackage} className="flex-1 bg-amber-600 text-white py-2 rounded hover:bg-amber-700">
                                    Confirm
                                </button>
                                <button onClick={() => setShowBottleForm(false)} className="flex-1 bg-gray-300 text-gray-700 py-2 rounded hover:bg-gray-400">
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {(batch.packageDate) && (
                    <div className="bg-white rounded-lg shadow p-6">
                        <h3 className="text-xl font-bold mb-4">Finished!</h3>
                        <p className="text-sm">
                            <span className="font-medium">{packageTypes[batch.packageType]}</span> on {new Date(batch.packageDate).toLocaleDateString()}
                        </p>
                        <div className="mt-4 p-3 bg-green-50 rounded">
                            <p className="text-sm font-medium">Batch Summary</p>
                            <p className="text-sm">ABV: {batch.abv}%</p>
                            {batch.backsweeteningSG && (
                                <p className="text-sm">Final Specific Gravity: {batch.backsweeteningSG.toFixed(3)}</p>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default MeadBatchTracker;

