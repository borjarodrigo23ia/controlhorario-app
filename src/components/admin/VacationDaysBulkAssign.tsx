import React, { useState, useEffect, useMemo } from 'react';
import { useVacationDays } from '@/hooks/useVacationDays';
import { useUsers } from '@/hooks/useUsers';
import { Calendar, Users, Check, Search, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';

export default function VacationDaysBulkAssign() {
    const currentYear = new Date().getFullYear();
    const [selectedYear, setSelectedYear] = useState(currentYear);
    const [daysInput, setDaysInput] = useState('22');
    const [selectedUserIds, setSelectedUserIds] = useState<Set<number>>(new Set());
    const [searchTerm, setSearchTerm] = useState('');
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    const { users, loading: loadingUsers } = useUsers();
    const { bulkSetVacationDays, loading: submitting, error } = useVacationDays();

    // Filter users by search term
    const filteredUsers = useMemo(() => {
        if (!searchTerm) return users;
        const term = searchTerm.toLowerCase();
        return users.filter(user =>
            `${user.firstname} ${user.lastname}`.toLowerCase().includes(term) ||
            user.login.toLowerCase().includes(term)
        );
    }, [users, searchTerm]);

    // Check if all filtered users are selected
    const allFilteredSelected = useMemo(() => {
        if (filteredUsers.length === 0) return false;
        return filteredUsers.every(user => selectedUserIds.has(parseInt(user.id)));
    }, [filteredUsers, selectedUserIds]);

    const toggleUser = (userId: number) => {
        const newSet = new Set(selectedUserIds);
        if (newSet.has(userId)) {
            newSet.delete(userId);
        } else {
            newSet.add(userId);
        }
        setSelectedUserIds(newSet);
    };

    const toggleSelectAll = () => {
        if (allFilteredSelected) {
            // Deselect all filtered
            const newSet = new Set(selectedUserIds);
            filteredUsers.forEach(user => newSet.delete(parseInt(user.id)));
            setSelectedUserIds(newSet);
        } else {
            // Select all filtered
            const newSet = new Set(selectedUserIds);
            filteredUsers.forEach(user => newSet.add(parseInt(user.id)));
            setSelectedUserIds(newSet);
        }
    };

    const handleApply = async () => {
        const days = parseInt(daysInput);
        if (isNaN(days) || days < 0) {
            return;
        }

        if (selectedUserIds.size === 0) {
            return;
        }

        setSuccessMessage(null);
        const result = await bulkSetVacationDays(Array.from(selectedUserIds), selectedYear, days);

        if (result.success) {
            setSuccessMessage(`✓ Asignados ${days} días a ${result.successCount} usuarios`);
            setSelectedUserIds(new Set());
            setTimeout(() => setSuccessMessage(null), 5000);
        }
    };

    const getUserInitial = (user: any) => {
        return (user.firstname?.[0] || user.login?.[0] || '?').toUpperCase();
    };

    const getUserDisplayName = (user: any) => {
        if (user.firstname && user.lastname) {
            return `${user.firstname} ${user.lastname}`;
        }
        return user.login;
    };

    return (
        <div className="bg-white dark:bg-zinc-900 rounded-3xl p-8 border border-gray-100 dark:border-zinc-800 shadow-sm">
            <div className="flex items-center gap-3 mb-8">
                <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary">
                    <Calendar className="w-6 h-6" />
                </div>
                <div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                        Asignar Días de Vacaciones
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        Asigna días masivamente a múltiples empleados
                    </p>
                </div>
            </div>

            {/* Year and Days Input */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <div className="space-y-3">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">
                        Año
                    </label>
                    <select
                        value={selectedYear}
                        onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                        className="w-full bg-gray-50 dark:bg-zinc-800 border border-gray-100 dark:border-zinc-700 rounded-2xl px-5 py-4 text-gray-900 dark:text-white font-medium focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none"
                    >
                        {[currentYear - 1, currentYear, currentYear + 1, currentYear + 2].map(year => (
                            <option key={year} value={year}>{year}</option>
                        ))}
                    </select>
                </div>

                <div className="space-y-3">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">
                        Días de Vacaciones
                    </label>
                    <input
                        type="number"
                        min="0"
                        value={daysInput}
                        onChange={(e) => setDaysInput(e.target.value)}
                        className="w-full bg-gray-50 dark:bg-zinc-800 border border-gray-100 dark:border-zinc-700 rounded-2xl px-5 py-4 text-gray-900 dark:text-white font-medium focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none"
                        placeholder="22"
                    />
                </div>
            </div>

            {/* User Selection Panel */}
            <div className="space-y-4">
                <div className="flex items-center justify-between gap-4">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                        Seleccionar Empleados
                    </label>
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                        {selectedUserIds.size} seleccionados
                    </span>
                </div>

                {/* Search and Select All */}
                <div className="flex gap-3">
                    <div className="flex-1 relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input
                            type="text"
                            placeholder="Buscar empleado..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-12 pr-4 py-3 bg-gray-50 dark:bg-zinc-800 rounded-xl border border-gray-100 dark:border-zinc-700 focus:bg-white dark:focus:bg-black focus:border-primary outline-none transition-all text-sm"
                        />
                    </div>
                    <button
                        onClick={toggleSelectAll}
                        className="px-6 py-3 bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 dark:hover:bg-zinc-700 rounded-xl font-bold text-sm text-gray-700 dark:text-gray-200 transition-all active:scale-95 whitespace-nowrap"
                    >
                        {allFilteredSelected ? 'Deseleccionar' : 'Seleccionar'} Todos
                    </button>
                </div>

                {/* User List */}
                <div className="max-h-96 overflow-y-auto bg-gray-50 dark:bg-zinc-800/50 rounded-2xl border border-gray-100 dark:border-zinc-700 p-2">
                    {loadingUsers ? (
                        <div className="flex items-center justify-center py-12 text-gray-400">
                            <Loader2 className="w-6 h-6 animate-spin" />
                        </div>
                    ) : filteredUsers.length === 0 ? (
                        <div className="text-center py-12 text-gray-400">
                            {searchTerm ? 'No se encontraron empleados' : 'No hay empleados disponibles'}
                        </div>
                    ) : (
                        <div className="space-y-1">
                            {filteredUsers.map(user => {
                                const userId = parseInt(user.id);
                                const isSelected = selectedUserIds.has(userId);

                                return (
                                    <label
                                        key={user.id}
                                        className={`flex items-center gap-4 p-4 rounded-xl cursor-pointer transition-all ${isSelected
                                                ? 'bg-primary/10 border-2 border-primary'
                                                : 'bg-white dark:bg-zinc-900 border-2 border-transparent hover:bg-gray-50 dark:hover:bg-zinc-800'
                                            }`}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={isSelected}
                                            onChange={() => toggleUser(userId)}
                                            className="w-5 h-5 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
                                        />

                                        <div className="w-10 h-10 bg-gradient-to-br from-primary/20 to-primary/40 rounded-full flex items-center justify-center font-bold text-primary">
                                            {getUserInitial(user)}
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <p className="font-semibold text-gray-900 dark:text-white truncate">
                                                {getUserDisplayName(user)}
                                            </p>
                                            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                                {user.login}
                                            </p>
                                        </div>

                                        {isSelected && (
                                            <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                                                <Check className="w-5 h-5 text-white" />
                                            </div>
                                        )}
                                    </label>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            {/* Messages */}
            {error && (
                <div className="p-4 bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/20 rounded-2xl flex items-start gap-3 text-red-600 dark:text-red-400 text-sm font-medium mt-6">
                    <AlertCircle size={18} className="shrink-0 mt-0.5" />
                    <p>{error}</p>
                </div>
            )}

            {successMessage && (
                <div className="p-4 bg-green-50 dark:bg-green-900/10 border border-green-100 dark:border-green-900/20 rounded-2xl flex items-start gap-3 text-green-600 dark:text-green-400 text-sm font-medium mt-6">
                    <CheckCircle2 size={18} className="shrink-0 mt-0.5" />
                    <p>{successMessage}</p>
                </div>
            )}

            {/* Apply Button */}
            <button
                onClick={handleApply}
                disabled={submitting || selectedUserIds.size === 0 || !daysInput || parseInt(daysInput) < 0}
                className="w-full mt-6 bg-black dark:bg-white text-white dark:text-black hover:opacity-90 active:scale-[0.98] font-bold py-4 rounded-2xl transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
            >
                {submitting ? (
                    <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Asignando...
                    </>
                ) : (
                    <>
                        <Users size={20} />
                        Asignar a {selectedUserIds.size} empleado{selectedUserIds.size !== 1 ? 's' : ''}
                    </>
                )}
            </button>
        </div>
    );
}
