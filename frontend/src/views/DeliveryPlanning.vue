<template>
  <div class="px-4 py-6 sm:px-0">
    <div v-if="loading" class="text-center py-8 text-gray-500">
      Loading delivery planning...
    </div>

    <div v-else-if="!order" class="text-center py-12 bg-white rounded-lg shadow">
      <p class="text-gray-500 mb-4">Order not found</p>
      <router-link
        :to="`/orders/${orderId}`"
        class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 cursor-pointer inline-block"
      >
        Back to Order
      </router-link>
    </div>

    <div v-else>
      <!-- Header -->
      <div class="mb-6 flex justify-between items-start">
        <div>
          <h2 class="text-3xl font-bold text-gray-900">Delivery Planning - {{ order.name }}</h2>
          <p class="mt-1 text-sm text-gray-500">Plan delivery routes and group schools</p>
        </div>
        <div class="flex gap-2">
          <button
            @click="showAutoGroupModal = true"
            class="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 cursor-pointer text-sm"
            :disabled="unassignedSchools.length === 0"
          >
            Auto-Group Schools
          </button>
          <router-link
            :to="`/orders/${orderId}`"
            class="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 cursor-pointer"
          >
            Back to Order
          </router-link>
        </div>
      </div>

      <!-- Statistics Dashboard -->
      <div v-if="statistics" class="mb-6 grid grid-cols-1 md:grid-cols-5 gap-4">
        <div class="bg-white shadow rounded-lg p-4">
          <div class="text-sm text-gray-600">Total Schools</div>
          <div class="text-2xl font-bold text-gray-900">{{ statistics.total_schools || 0 }}</div>
        </div>
        <div class="bg-white shadow rounded-lg p-4">
          <div class="text-sm text-gray-600">Total Structures</div>
          <div class="text-2xl font-bold text-gray-900">{{ statistics.total_structures || 0 }}</div>
        </div>
        <div class="bg-white shadow rounded-lg p-4">
          <div class="text-sm text-gray-600">Total Kits</div>
          <div class="text-2xl font-bold text-gray-900">{{ statistics.total_kits || 0 }}</div>
        </div>
        <div class="bg-white shadow rounded-lg p-4">
          <div class="text-sm text-gray-600">Delivery Groups</div>
          <div class="text-2xl font-bold text-gray-900">{{ statistics.total_groups || 0 }}</div>
        </div>
        <div class="bg-white shadow rounded-lg p-4">
          <div class="text-sm text-gray-600">Unassigned</div>
          <div class="text-2xl font-bold text-orange-600">{{ statistics.unassigned_schools || 0 }}</div>
        </div>
      </div>

      <!-- Filtering and Search -->
      <div class="mb-6 bg-white shadow rounded-lg p-4">
        <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Search</label>
            <input
              v-model="searchQuery"
              type="text"
              placeholder="School name..."
              class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">City Type</label>
            <select
              v-model="filterCityType"
              class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            >
              <option value="">All Types</option>
              <option value="urban">Urban</option>
              <option value="rural">Rural</option>
              <option value="urban-small">Urban Small</option>
              <option value="urban-large">Urban Large</option>
            </select>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              v-model="filterStatus"
              class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            >
              <option value="">All Status</option>
              <option value="assigned">Assigned</option>
              <option value="unassigned">Unassigned</option>
            </select>
          </div>
          <div class="flex items-end">
            <button
              @click="bulkAssignSelected"
              :disabled="selectedSchoolIds.length === 0"
              class="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 cursor-pointer text-sm disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              Assign Selected ({{ selectedSchoolIds.length }})
            </button>
          </div>
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <!-- Map Section -->
        <div class="lg:col-span-2">
          <div class="bg-white shadow rounded-lg p-4">
            <div id="map" class="w-full h-96 rounded-lg"></div>
          </div>
        </div>

        <!-- Delivery Groups Sidebar -->
        <div class="space-y-4">
          <div class="bg-white shadow rounded-lg p-4">
            <div class="flex justify-between items-center mb-4">
              <h3 class="text-lg font-medium text-gray-900">Delivery Groups</h3>
              <button
                @click="showAddGroupModal = true"
                class="px-3 py-1 bg-green-600 text-white rounded-md hover:bg-green-700 cursor-pointer text-sm"
              >
                + Add Group
              </button>
            </div>

            <div v-if="!order.delivery_groups || order.delivery_groups.length === 0" class="text-sm text-gray-500">
              No delivery groups yet. Create one to start planning.
            </div>

            <div v-else class="space-y-2">
              <div
                v-for="group in order.delivery_groups"
                :key="group.id"
                class="p-3 border rounded-md cursor-pointer hover:bg-gray-50"
                :class="{ 'border-blue-500 bg-blue-50': selectedGroupId === group.id }"
              >
                <div @click="selectGroup(group.id)" class="flex justify-between items-start mb-2">
                  <div class="flex-1">
                    <div class="font-medium text-sm">{{ group.name }}</div>
                    <div v-if="group.delivery_date" class="text-xs text-gray-600 mt-1">
                      {{ formatDate(group.delivery_date) }}
                      <span v-if="group.delivery_hour"> at {{ group.delivery_hour }}</span>
                    </div>
                    <div class="text-xs text-gray-600 mt-1">
                      {{ getGroupSchoolCount(group.id) }} schools, {{ getGroupKits(group.id) }} kits
                    </div>
                    <div v-if="group.start_address" class="text-xs text-gray-500 mt-1">
                      📍 Start: {{ group.start_address }}
                    </div>
                    <div v-if="group.calculated_distance_km || group.total_km || group.two_way_km" class="text-xs text-gray-600 mt-1 font-medium">
                      📏 
                      <span v-if="group.calculated_distance_km">Route: {{ formatDistance(group.calculated_distance_km) }} km</span>
                      <span v-if="group.total_km"> | Total: {{ formatDistance(group.total_km) }} km</span>
                      <span v-if="group.two_way_km"> | 2-way: {{ formatDistance(group.two_way_km) }} km</span>
                    </div>
                    <div v-if="group.fuel_type && group.fuel_cost_per_liter" class="text-xs text-gray-600 mt-1">
                      ⛽ {{ group.fuel_type }} - {{ formatCurrency(group.fuel_cost_per_liter) }}/L
                      <span v-if="group.fuel_consumption && group.fuel_cost_per_liter">
                        | Fuel: {{ group.fuel_consumption.toFixed(2) }}L ({{ formatCurrency(group.fuel_consumption * group.fuel_cost_per_liter) }})
                      </span>
                      <span v-else-if="group.total_km && group.fuel_cost_per_liter && estimatedFuelConsumption(group.total_km)">
                        | Est. cost: {{ formatCurrency(calculateFuelCost(group.total_km, group.fuel_cost_per_liter)) }}
                      </span>
                    </div>
                  </div>
                  <div class="flex gap-1 ml-2">
                    <button
                      @click.stop="editDeliveryGroup(group)"
                      class="px-2 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700"
                      title="Edit Group"
                    >
                      ✏️
                    </button>
                    <button
                      @click.stop="openScheduleModal(group)"
                      class="px-2 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700"
                      title="Schedule Delivery"
                    >
                      ⏰
                    </button>
                    <button
                      @click.stop="optimizeGroupRoute(group.id)"
                      class="px-2 py-1 bg-purple-600 text-white rounded text-xs hover:bg-purple-700"
                      title="Optimize Route"
                    >
                      🗺️
                    </button>
                    <button
                      @click.stop="confirmDeleteGroup(group)"
                      class="px-2 py-1 bg-red-600 text-white rounded text-xs hover:bg-red-700"
                      title="Delete Group"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Unassigned Schools -->
          <div class="bg-white shadow rounded-lg p-4">
            <h3 class="text-lg font-medium text-gray-900 mb-4">Unassigned Schools</h3>
            <div v-if="unassignedSchools.length === 0" class="text-sm text-gray-500">
              All schools are assigned to delivery groups.
            </div>
            <div v-else class="space-y-2 max-h-64 overflow-y-auto">
              <div
                v-for="school in unassignedSchools"
                :key="school.id"
                class="p-2 border rounded-md text-sm cursor-pointer hover:bg-gray-50"
                @click="selectSchool(school)"
              >
                <div class="font-medium">{{ school.name }}</div>
                <div class="text-xs text-gray-600">{{ school.city }}</div>
                <div class="text-xs text-gray-600">{{ school.calculated_kits || 0 }} kits</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Schools List -->
      <div class="mt-6 bg-white shadow rounded-lg p-6">
        <h3 class="text-lg font-medium text-gray-900 mb-4">All Schools</h3>
        <div class="overflow-x-auto">
          <table class="min-w-full divide-y divide-gray-200">
            <thead class="bg-gray-50">
              <tr>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  <input
                    type="checkbox"
                    :checked="allSchoolsSelected"
                    @change="toggleSelectAll"
                    class="rounded"
                  />
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">School</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">City</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Kits</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Delivery Group</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
              <tr v-for="school in filteredSchools" :key="school.id">
                <td class="px-6 py-4 text-sm">
                  <input
                    type="checkbox"
                    :checked="selectedSchoolIds.includes(school.id)"
                    @change="toggleSchoolSelection(school.id)"
                    class="rounded"
                  />
                </td>
                <td class="px-6 py-4 text-sm text-gray-900">{{ school.name }}</td>
                <td class="px-6 py-4 text-sm text-gray-600">{{ school.city }}</td>
                <td class="px-6 py-4 text-sm text-gray-600">{{ school.calculated_kits || 0 }}</td>
                <td class="px-6 py-4 text-sm">
                  <select
                    :value="school.delivery_status || 'planned'"
                    @change="(e: any) => updateSchoolStatus(school, e.target.value)"
                    class="border border-gray-300 rounded-md px-2 py-1 text-xs"
                  >
                    <option value="planned">Planned</option>
                    <option value="in-transit">In Transit</option>
                    <option value="delivered">Delivered</option>
                    <option value="completed">Completed</option>
                  </select>
                </td>
                <td class="px-6 py-4 text-sm">
                  <select
                    :value="school.delivery_group_id || ''"
                    @change="(e: any) => assignSchoolToGroup(school, e.target.value ? parseInt(e.target.value) : null)"
                    class="border border-gray-300 rounded-md px-2 py-1 text-sm"
                  >
                    <option value="">-- None --</option>
                    <option
                      v-for="group in order.delivery_groups"
                      :key="group.id"
                      :value="group.id"
                    >
                      {{ group.name }}
                    </option>
                  </select>
                </td>
                <td class="px-6 py-4 text-sm">
                  <button
                    @click="centerMapOnSchool(school)"
                    class="px-2 py-1 bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 cursor-pointer text-xs mr-1"
                  >
                    Map
                  </button>
                  <button
                    @click="showSchoolNotesModal(school)"
                    class="px-2 py-1 bg-green-100 text-green-700 rounded-md hover:bg-green-200 cursor-pointer text-xs"
                    title="Notes"
                  >
                    📝
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Add Delivery Group Modal -->
    <div
      v-if="showAddGroupModal"
      class="fixed inset-0 bg-gray-600/75 overflow-y-auto h-full w-full z-[401]"
      @click.self="showAddGroupModal = false"
    >
      <div class="relative top-20 mx-auto p-6 border w-full max-w-md shadow-lg rounded-md bg-white">
        <div class="flex justify-between items-center mb-4">
          <h3 class="text-lg font-medium text-gray-900">{{ editingGroupId ? 'Edit Delivery Group' : 'Create Delivery Group' }}</h3>
          <button
            @click="closeGroupModal"
            class="text-gray-400 hover:text-gray-600 cursor-pointer"
          >
            ✕
          </button>
        </div>

        <form @submit.prevent="saveDeliveryGroup" class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Group Name *</label>
            <input
              v-model="groupData.name"
              type="text"
              required
              class="w-full border border-gray-300 rounded-md px-3 py-2"
              placeholder="e.g., Route 1"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              v-model="groupData.description"
              rows="2"
              class="w-full border border-gray-300 rounded-md px-3 py-2"
              placeholder="Optional description"
            />
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Delivery Date</label>
              <input
                v-model="groupData.delivery_date"
                type="date"
                class="w-full border border-gray-300 rounded-md px-3 py-2"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Delivery Hour</label>
              <input
                v-model="groupData.delivery_hour"
                type="time"
                class="w-full border border-gray-300 rounded-md px-3 py-2"
              />
            </div>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Start Address (Optional)</label>
            <input
              v-model="groupData.start_address"
              type="text"
              class="w-full border border-gray-300 rounded-md px-3 py-2"
              placeholder="Starting point for this delivery route"
              @blur="geocodeStartAddress"
            />
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Fuel Type</label>
              <select
                v-model="groupData.fuel_type"
                class="w-full border border-gray-300 rounded-md px-3 py-2"
              >
                <option value="">-- Select --</option>
                <option value="Gasoline">Gasoline</option>
                <option value="Diesel">Diesel</option>
                <option value="LPG">LPG</option>
                <option value="Electric">Electric</option>
              </select>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Fuel Cost per Liter (RON)</label>
              <input
                v-model.number="groupData.fuel_cost_per_liter"
                type="number"
                step="0.01"
                min="0"
                class="w-full border border-gray-300 rounded-md px-3 py-2"
                placeholder="e.g., 7.50"
              />
            </div>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">
                Total KM (Optional)
                <span v-if="groupData.calculated_distance_km" class="text-xs text-gray-500">
                  (Route: {{ formatDistance(groupData.calculated_distance_km) }} km)
                </span>
              </label>
              <input
                v-model.number="groupData.total_km"
                type="number"
                step="0.1"
                min="0"
                class="w-full border border-gray-300 rounded-md px-3 py-2"
                placeholder="Enter total km"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">2-Way KM (Optional)</label>
              <input
                v-model.number="groupData.two_way_km"
                type="number"
                step="0.1"
                min="0"
                class="w-full border border-gray-300 rounded-md px-3 py-2"
                placeholder="Enter round trip km"
              />
            </div>
          </div>

          <div class="flex justify-end gap-2 pt-4">
            <button
              type="button"
              @click="closeGroupModal"
              class="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              :disabled="savingGroup"
              class="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 cursor-pointer disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {{ savingGroup ? (editingGroupId ? 'Saving...' : 'Creating...') : (editingGroupId ? 'Save Changes' : 'Create Group') }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Auto-Group Modal -->
    <div
      v-if="showAutoGroupModal"
      class="fixed inset-0 bg-gray-600/75 overflow-y-auto h-full w-full z-[401]"
      @click.self="showAutoGroupModal = false"
    >
      <div class="relative top-20 mx-auto p-6 border w-full max-w-md shadow-lg rounded-md bg-white">
        <div class="flex justify-between items-center mb-4">
          <h3 class="text-lg font-medium text-gray-900">Auto-Group Schools</h3>
          <button
            @click="showAutoGroupModal = false"
            class="text-gray-400 hover:text-gray-600 cursor-pointer"
          >
            ✕
          </button>
        </div>

        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Max Distance (km)</label>
            <input
              v-model.number="autoGroupMaxDistance"
              type="number"
              min="1"
              max="200"
              class="w-full border border-gray-300 rounded-md px-3 py-2"
              placeholder="50"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Group Name Prefix</label>
            <input
              v-model="autoGroupPrefix"
              type="text"
              class="w-full border border-gray-300 rounded-md px-3 py-2"
              placeholder="Route"
            />
          </div>

          <div class="text-sm text-gray-600">
            This will create delivery groups by clustering unassigned schools within the specified distance.
            <br>{{ unassignedSchools.length }} unassigned schools available.
          </div>

          <div class="flex justify-end gap-2 pt-4">
            <button
              type="button"
              @click="showAutoGroupModal = false"
              class="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 cursor-pointer"
            >
              Cancel
            </button>
            <button
              @click="performAutoGroup"
              :disabled="autoGrouping"
              class="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 cursor-pointer disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {{ autoGrouping ? 'Grouping...' : 'Auto-Group' }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- School Notes Modal -->
    <div
      v-if="selectedSchoolForNotes"
      class="fixed inset-0 bg-gray-600/75 overflow-y-auto h-full w-full z-[401]"
      @click.self="selectedSchoolForNotes = null"
    >
      <div class="relative top-20 mx-auto p-6 border w-full max-w-md shadow-lg rounded-md bg-white">
        <div class="flex justify-between items-center mb-4">
          <h3 class="text-lg font-medium text-gray-900">Delivery Notes - {{ selectedSchoolForNotes.name }}</h3>
          <button
            @click="selectedSchoolForNotes = null"
            class="text-gray-400 hover:text-gray-600 cursor-pointer"
          >
            ✕
          </button>
        </div>

        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Delivery Notes</label>
            <textarea
              v-model="schoolNotes"
              rows="4"
              class="w-full border border-gray-300 rounded-md px-3 py-2"
              placeholder="Parking instructions, entrance details, contact person on site..."
            />
          </div>

          <div class="flex justify-end gap-2 pt-4">
            <button
              type="button"
              @click="selectedSchoolForNotes = null"
              class="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 cursor-pointer"
            >
              Cancel
            </button>
            <button
              @click="saveSchoolNotes"
              :disabled="savingNotes"
              class="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 cursor-pointer disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {{ savingNotes ? 'Saving...' : 'Save Notes' }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Bulk Assign Modal -->
    <div
      v-if="showBulkAssignModal"
      class="fixed inset-0 bg-gray-600/75 overflow-y-auto h-full w-full z-[401]"
      @click.self="showBulkAssignModal = false"
    >
      <div class="relative top-20 mx-auto p-6 border w-full max-w-md shadow-lg rounded-md bg-white">
        <div class="flex justify-between items-center mb-4">
          <h3 class="text-lg font-medium text-gray-900">Assign {{ selectedSchoolIds.length }} Schools</h3>
          <button
            @click="showBulkAssignModal = false"
            class="text-gray-400 hover:text-gray-600 cursor-pointer"
          >
            ✕
          </button>
        </div>

        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Delivery Group</label>
            <select
              v-model="bulkAssignGroupId"
              class="w-full border border-gray-300 rounded-md px-3 py-2"
            >
              <option :value="null">-- None (Unassign) --</option>
              <option
                v-for="group in order?.delivery_groups"
                :key="group.id"
                :value="group.id"
              >
                {{ group.name }}
              </option>
            </select>
          </div>

          <div class="flex justify-end gap-2 pt-4">
            <button
              type="button"
              @click="showBulkAssignModal = false"
              class="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 cursor-pointer"
            >
              Cancel
            </button>
            <button
              @click="performBulkAssign"
              :disabled="bulkAssigning"
              class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 cursor-pointer disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {{ bulkAssigning ? 'Assigning...' : 'Assign' }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Schedule Modal -->
    <div
      v-if="showScheduleModal && selectedGroupForSchedule"
      class="fixed inset-0 bg-gray-600/75 overflow-y-auto h-full w-full z-[401]"
      @click.self="showScheduleModal = false"
    >
      <div class="relative top-10 mx-auto p-6 border w-full max-w-4xl shadow-lg rounded-md bg-white">
        <div class="flex justify-between items-center mb-4">
          <h3 class="text-lg font-medium text-gray-900">Schedule Delivery - {{ selectedGroupForSchedule.name }}</h3>
          <button
            @click="showScheduleModal = false"
            class="text-gray-400 hover:text-gray-600 cursor-pointer"
          >
            ✕
          </button>
        </div>

        <div class="space-y-4">
          <!-- Schedule Settings -->
          <div class="bg-gray-50 p-4 rounded-md">
            <h4 class="font-medium mb-3">Schedule Settings</h4>
            <div class="grid grid-cols-3 gap-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Start Time (First Location)</label>
                <input
                  v-model="scheduleStartTime"
                  type="time"
                  class="w-full border border-gray-300 rounded-md px-3 py-2"
                  placeholder="08:30"
                />
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Document Check Duration (min)</label>
                <input
                  v-model.number="documentCheckDuration"
                  type="number"
                  min="0"
                  max="120"
                  class="w-full border border-gray-300 rounded-md px-3 py-2"
                />
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Distribution Time per Kit (min)</label>
                <input
                  v-model.number="distributionTimePerKit"
                  type="number"
                  step="0.1"
                  min="0.1"
                  max="10"
                  class="w-full border border-gray-300 rounded-md px-3 py-2"
                />
              </div>
            </div>
            <button
              @click="autoScheduleGroup"
              class="mt-3 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
            >
              ⏰ Auto-Schedule All Locations
            </button>
          </div>

          <!-- Schedule Timeline -->
          <div class="border rounded-md overflow-hidden">
            <table class="min-w-full divide-y divide-gray-200">
              <thead class="bg-gray-50">
                <tr>
                  <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">#</th>
                  <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">School/Location</th>
                  <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Kits</th>
                  <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Start Time</th>
                  <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Documents</th>
                  <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Distribution</th>
                  <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">End Time</th>
                  <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Travel Time</th>
                </tr>
              </thead>
              <tbody class="bg-white divide-y divide-gray-200">
                <tr v-for="(location, index) in getGroupLocationsForSchedule(selectedGroupForSchedule.id)" :key="location.id" :class="['hover:bg-gray-50', location.type === 'structure' ? 'bg-blue-50' : '']">
                  <td class="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">{{ index + 1 }}</td>
                  <td class="px-4 py-3 text-sm text-gray-900">
                    <div class="font-medium">{{ location.name }}</div>
                    <div class="text-xs text-gray-500">{{ location.schoolName }} - {{ location.city }}</div>
                    <div v-if="location.type === 'structure' && location.inSameBuilding" class="text-xs text-blue-600 mt-1">
                      📍 Same building as school
                    </div>
                  </td>
                  <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                    {{ location.kits || 0 }}
                  </td>
                  <td class="px-4 py-3 whitespace-nowrap">
                    <input
                      v-model="location.scheduled_start_time"
                      type="time"
                      class="text-sm border border-gray-300 rounded px-2 py-1"
                      @change="recalculateSchedule(location, index)"
                    />
                  </td>
                  <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                    <input
                      v-model.number="location.document_check_duration"
                      type="number"
                      min="0"
                      max="120"
                      class="w-16 text-sm border border-gray-300 rounded px-2 py-1"
                      @change="recalculateSchedule(location, index)"
                    /> min
                  </td>
                  <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                    <input
                      v-model.number="location.distribution_duration"
                      type="number"
                      min="0"
                      max="600"
                      class="w-16 text-sm border border-gray-300 rounded px-2 py-1"
                      @change="recalculateSchedule(location, index)"
                    /> min
                  </td>
                  <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                    {{ location.scheduled_end_time || '-' }}
                  </td>
                  <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                    {{ getTravelTimeToNext(location, index) }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="flex justify-end gap-2 pt-4">
            <button
              type="button"
              @click="showScheduleModal = false"
              class="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 cursor-pointer"
            >
              Cancel
            </button>
            <button
              @click="saveSchedule"
              :disabled="savingSchedule"
              class="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 cursor-pointer disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {{ savingSchedule ? 'Saving...' : 'Save Schedule' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch, onUnmounted } from 'vue';
import { useRoute } from 'vue-router';
import { useOrdersStore } from '@/stores/orders';
import type { School, DeliveryGroup, Structure } from '@/types/order';
import * as L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet default icon paths for Vite
// Use CDN URLs for marker icons to avoid path resolution issues
L.Icon.Default.mergeOptions({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png'
});

const route = useRoute();
const ordersStore = useOrdersStore();

const orderId = computed(() => parseInt(route.params.id as string));
const order = computed(() => ordersStore.currentOrder);
const loading = computed(() => ordersStore.loading);

const map = ref<L.Map | null>(null);
const markers = ref<L.Marker[]>([]);
const polylines = ref<L.Polyline[]>([]);
const selectedGroupId = ref<number | null>(null);
const isDrawingRoute = ref(false);

const showAddGroupModal = ref(false);
const editingGroupId = ref<number | null>(null);
const groupData = ref<Partial<DeliveryGroup>>({});
const savingGroup = ref(false);

const showAutoGroupModal = ref(false);
const autoGroupMaxDistance = ref(50);
const autoGroupPrefix = ref('Route');
const autoGrouping = ref(false);

const statistics = ref<any>(null);

const searchQuery = ref('');
const filterCityType = ref('');
const filterStatus = ref('');

const selectedSchoolIds = ref<number[]>([]);
const showBulkAssignModal = ref(false);
const bulkAssignGroupId = ref<number | null>(null);
const bulkAssigning = ref(false);

const selectedSchoolForNotes = ref<School | null>(null);
const schoolNotes = ref('');
const savingNotes = ref(false);

const showScheduleModal = ref(false);
const selectedGroupForSchedule = ref<DeliveryGroup | null>(null);
const scheduleStartTime = ref('');
const documentCheckDuration = ref(20); // minutes, default 20
const distributionTimePerKit = ref(1); // minutes per kit, default 1
const savingSchedule = ref(false);

const unassignedSchools = computed(() => {
  if (!order.value?.schools) return [];
  return order.value.schools.filter(s => !s.delivery_group_id);
});

const filteredSchools = computed(() => {
  if (!order.value?.schools) return [];
  let schools = order.value.schools;
  
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase();
    schools = schools.filter(s => s.name.toLowerCase().includes(query) || s.city.toLowerCase().includes(query));
  }
  
  if (filterCityType.value) {
    schools = schools.filter(s => s.city_type === filterCityType.value);
  }
  
  if (filterStatus.value === 'assigned') {
    schools = schools.filter(s => s.delivery_group_id !== null);
  } else if (filterStatus.value === 'unassigned') {
    schools = schools.filter(s => s.delivery_group_id === null);
  }
  
  return schools;
});

const allSchoolsSelected = computed(() => {
  return filteredSchools.value.length > 0 && 
         filteredSchools.value.every(s => selectedSchoolIds.value.includes(s.id));
});

function formatDate(dateString: string | null) {
  if (!dateString) return '';
  try {
    return new Date(dateString).toLocaleDateString();
  } catch {
    return dateString;
  }
}

function formatDistance(km: number | null | undefined) {
  if (!km && km !== 0) return 'N/A';
  return km.toFixed(1);
}

function formatCurrency(amount: number | null | undefined) {
  if (!amount && amount !== 0) return 'N/A';
  return `${amount.toFixed(2)} RON`;
}

function estimatedFuelConsumption(totalKm: number | null | undefined) {
  // Average fuel consumption estimate (can be customized)
  // Assuming ~7L/100km average
  return totalKm ? true : false;
}

function calculateFuelCost(totalKm: number | null | undefined, costPerLiter: number | null | undefined) {
  if (!totalKm || !costPerLiter) return null;
  // Average fuel consumption: ~7L per 100km
  const liters = (totalKm / 100) * 7;
  return liters * costPerLiter;
}

function getStatusColor(status: string) {
  const colors: Record<string, string> = {
    'planned': '#6b7280',
    'in-transit': '#3b82f6',
    'delivered': '#10b981',
    'completed': '#059669'
  };
  return colors[status] || '#6b7280';
}

function getGroupSchoolCount(groupId: number) {
  if (!order.value?.schools) return 0;
  return order.value.schools.filter(s => s.delivery_group_id === groupId).length;
}

function getGroupKits(groupId: number) {
  if (!order.value?.schools) return 0;
  return order.value.schools
    .filter(s => s.delivery_group_id === groupId)
    .reduce((sum, s) => sum + (s.calculated_kits || 0), 0);
}

function toggleSelectAll() {
  if (allSchoolsSelected.value) {
    selectedSchoolIds.value = selectedSchoolIds.value.filter(id => !filteredSchools.value.find(s => s.id === id));
  } else {
    filteredSchools.value.forEach(school => {
      if (!selectedSchoolIds.value.includes(school.id)) {
        selectedSchoolIds.value.push(school.id);
      }
    });
  }
}

function toggleSchoolSelection(schoolId: number) {
  const index = selectedSchoolIds.value.indexOf(schoolId);
  if (index > -1) {
    selectedSchoolIds.value.splice(index, 1);
  } else {
    selectedSchoolIds.value.push(schoolId);
  }
}

function bulkAssignSelected() {
  if (selectedSchoolIds.value.length === 0) return;
  showBulkAssignModal.value = true;
  bulkAssignGroupId.value = null;
}

async function performBulkAssign() {
  if (selectedSchoolIds.value.length === 0) return;
  bulkAssigning.value = true;
  try {
    await ordersStore.bulkAssignSchools(orderId.value, selectedSchoolIds.value, bulkAssignGroupId.value);
    selectedSchoolIds.value = [];
    showBulkAssignModal.value = false;
    await ordersStore.fetchOrder(orderId.value);
    await loadStatistics();
    updateMapMarkers();
  } catch (error: any) {
    alert('Error assigning schools: ' + (error.message || error));
  } finally {
    bulkAssigning.value = false;
  }
}

async function updateSchoolStatus(school: School, status: string) {
  try {
    await ordersStore.updateSchool(orderId.value, school.id, {
      ...school,
      delivery_status: status as any
    });
    await ordersStore.fetchOrder(orderId.value);
  } catch (error: any) {
    alert('Error updating status: ' + (error.message || error));
  }
}

function showSchoolNotesModal(school: School) {
  selectedSchoolForNotes.value = school;
  schoolNotes.value = school.delivery_notes || '';
}

async function saveSchoolNotes() {
  if (!selectedSchoolForNotes.value) return;
  savingNotes.value = true;
  try {
    await ordersStore.updateSchool(orderId.value, selectedSchoolForNotes.value.id, {
      ...selectedSchoolForNotes.value,
      delivery_notes: schoolNotes.value
    });
    await ordersStore.fetchOrder(orderId.value);
    selectedSchoolForNotes.value = null;
    schoolNotes.value = '';
  } catch (error: any) {
    alert('Error saving notes: ' + (error.message || error));
  } finally {
    savingNotes.value = false;
  }
}

async function performAutoGroup() {
  autoGrouping.value = true;
  try {
    const result = await ordersStore.autoGroupSchools(orderId.value, autoGroupMaxDistance.value, autoGroupPrefix.value);
    showAutoGroupModal.value = false;
    await ordersStore.fetchOrder(orderId.value);
    await loadStatistics();
    updateMapMarkers();
    alert(`Created ${result.totalGroups} delivery groups`);
  } catch (error: any) {
    alert('Error auto-grouping: ' + (error.message || error));
  } finally {
    autoGrouping.value = false;
  }
}

async function optimizeGroupRoute(groupId: number) {
  try {
    await ordersStore.optimizeRoute(orderId.value, groupId);
    await ordersStore.fetchOrder(orderId.value);
    updateMapMarkers();
    alert('Route optimized successfully!');
  } catch (error: any) {
    alert('Error optimizing route: ' + (error.message || error));
  }
}

async function loadStatistics() {
  try {
    const result = await ordersStore.getStatistics(orderId.value);
    statistics.value = result.statistics;
  } catch (error: any) {
    console.error('Error loading statistics:', error);
  }
}

async function geocodeStartAddress() {
  if (!groupData.value.start_address) return;
  // Simple geocoding using Nominatim (OpenStreetMap)
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(groupData.value.start_address)}&limit=1`,
      { headers: { 'User-Agent': 'RoboDoc Delivery Planning' } }
    );
    const data = await response.json();
    if (data.length > 0) {
      groupData.value.start_latitude = parseFloat(data[0].lat);
      groupData.value.start_longitude = parseFloat(data[0].lon);
    }
  } catch (error) {
    console.error('Geocoding error:', error);
  }
}

function selectGroup(groupId: number) {
  const wasSelected = selectedGroupId.value === groupId;
  selectedGroupId.value = wasSelected ? null : groupId;
  
  // Wait for Vue to update DOM, then update map markers
  setTimeout(() => {
    updateMapMarkers();
  }, 50);
}

function selectSchool(school: School) {
  centerMapOnSchool(school);
}

async function assignSchoolToGroup(school: School, groupId: number | null) {
  try {
    // Send all school fields when updating to avoid validation errors
    await ordersStore.updateSchool(orderId.value, school.id, {
      name: school.name,
      address: school.address,
      city: school.city,
      contact_name: school.contact_name,
      contact_phone: school.contact_phone,
      contact_email: school.contact_email,
      kits_count: school.kits_count,
      city_type: school.city_type,
      latitude: school.latitude,
      longitude: school.longitude,
      is_standalone: school.is_standalone,
      delivery_group_id: groupId
    });
    await ordersStore.fetchOrder(orderId.value);
    updateMapMarkers();
  } catch (error: any) {
    alert('Error assigning school to group: ' + (error.message || error));
  }
}

function initMap() {
  if (!order.value) return;

  // Don't reinitialize if map already exists
  if (map.value) {
    // Just invalidate size in case container was resized
    setTimeout(() => {
      if (map.value) {
        map.value.invalidateSize();
      }
    }, 100);
    return;
  }

  // Default to Romania if no schools with coordinates
  const defaultCenter: [number, number] = [45.9432, 24.9668]; // Romania center
  let center = defaultCenter;
  let zoom = 7;

  // Collect all coordinates (standalone schools and structures)
  const allCoords: [number, number][] = [];
  order.value.schools?.forEach(school => {
    if (school.is_standalone && school.latitude && school.longitude) {
      allCoords.push([school.latitude, school.longitude]);
    } else if (school.structures) {
      school.structures.forEach((structure: any) => {
        if (structure.latitude && structure.longitude) {
          allCoords.push([structure.latitude, structure.longitude]);
        }
      });
    }
  });

  if (allCoords.length > 0) {
    const avgLat = allCoords.reduce((sum, coord) => sum + coord[0], 0) / allCoords.length;
    const avgLng = allCoords.reduce((sum, coord) => sum + coord[1], 0) / allCoords.length;
    center = [avgLat, avgLng];
    zoom = 9;
  }

  // Small delay to ensure DOM is ready
  setTimeout(() => {
    const mapElement = document.getElementById('map');
    if (!mapElement) {
      console.error('Map container not found');
      return;
    }

    // Check if map is already initialized on this element
    if ((mapElement as any)._leaflet_id) {
      console.warn('Map already initialized on this element');
      return;
    }

    map.value = L.map('map').setView(center, zoom);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19
    }).addTo(map.value as L.Map);

    updateMapMarkers();
  }, 50);
}

function updateMapMarkers() {
  if (!map.value || !order.value?.schools) {
    // If map doesn't exist yet, try to initialize it
    if (!map.value && order.value) {
      initMap();
    }
    return;
  }

  // Verify map is still valid (check if it has a container)
  try {
    const container = map.value.getContainer();
    if (!container || !container.parentElement) {
      // Map container was removed from DOM, but don't reinitialize immediately
      // This might be a temporary DOM update, just return
      return;
    }
  } catch (e) {
    // Map instance is invalid, but don't reinitialize in updateMarkers
    // Let the watch handler or initMap handle it
    return;
  }

  // Invalidate map size to ensure it renders correctly (after DOM updates)
  setTimeout(() => {
    if (map.value) {
      try {
        map.value.invalidateSize();
      } catch (e) {
        // Ignore size invalidation errors
      }
    }
  }, 100);

  // Clear existing markers and polylines
  if (map.value) {
    markers.value.forEach(marker => {
      try {
        (map.value as L.Map).removeLayer(marker as any);
      } catch (e) {
        // Marker might already be removed, ignore
      }
    });
    polylines.value.forEach(polyline => {
      try {
        (map.value as L.Map).removeLayer(polyline as any);
      } catch (e) {
        // Polyline might already be removed, ignore
      }
    });
  }
  markers.value = [];
  polylines.value = [];

  order.value.schools.forEach(school => {
    const isSelected = selectedGroupId.value && school.delivery_group_id === selectedGroupId.value;
    const isUnassigned = !school.delivery_group_id;

    // For standalone schools, use school coordinates
    if (school.is_standalone) {
      if (!school.latitude || !school.longitude) return;
      
      const statusBadge = school.delivery_status ? `<span style="background: ${getStatusColor(school.delivery_status)}; color: white; padding: 2px 6px; border-radius: 3px; font-size: 10px;">${school.delivery_status}</span>` : '';
      const notesHtml = school.delivery_notes ? `<br><small><em>📝 ${school.delivery_notes}</em></small>` : '';
      const marker = L.marker([school.latitude, school.longitude])
        .addTo(map.value as L.Map)
        .bindPopup(`
          <strong>${school.name}</strong> (Standalone)<br>
          ${school.city}<br>
          ${school.calculated_kits || 0} kits<br>
          ${school.delivery_group_name ? `Group: ${school.delivery_group_name}` : 'Unassigned'}<br>
          ${statusBadge}${notesHtml}
        `);

      if (isSelected) {
        marker.setIcon(L.icon({
          iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png',
          shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
          iconSize: [25, 41],
          iconAnchor: [12, 41],
          popupAnchor: [1, -34],
          shadowSize: [41, 41]
        }));
      } else if (isUnassigned) {
        marker.setIcon(L.icon({
          iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-yellow.png',
          shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
          iconSize: [25, 41],
          iconAnchor: [12, 41],
          popupAnchor: [1, -34],
          shadowSize: [41, 41]
        }));
      }

      markers.value.push(marker);
    } else {
      // For schools with structures, use structure coordinates
      if (school.structures && school.structures.length > 0) {
        school.structures.forEach((structure: any) => {
          if (!structure.latitude || !structure.longitude) return;

          const statusBadge = school.delivery_status ? `<span style="background: ${getStatusColor(school.delivery_status)}; color: white; padding: 2px 6px; border-radius: 3px; font-size: 10px;">${school.delivery_status}</span>` : '';
          const notesHtml = school.delivery_notes ? `<br><small><em>📝 ${school.delivery_notes}</em></small>` : '';
          const marker = L.marker([structure.latitude, structure.longitude])
            .addTo(map.value as L.Map)
            .bindPopup(`
              <strong>${structure.name}</strong><br>
              School: ${school.name}<br>
              ${school.city}<br>
              ${structure.kits_count || 0} kits<br>
              ${school.delivery_group_name ? `Group: ${school.delivery_group_name}` : 'Unassigned'}<br>
              ${statusBadge}${notesHtml}
            `);

          if (isSelected) {
            marker.setIcon(L.icon({
              iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png',
              shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
              iconSize: [25, 41],
              iconAnchor: [12, 41],
              popupAnchor: [1, -34],
              shadowSize: [41, 41]
            }));
          } else if (isUnassigned) {
            marker.setIcon(L.icon({
              iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-yellow.png',
              shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
              iconSize: [25, 41],
              iconAnchor: [12, 41],
              popupAnchor: [1, -34],
              shadowSize: [41, 41]
            }));
          }

          markers.value.push(marker);
        });
      }
    }
  });

  // Draw route polylines for selected group
  if (selectedGroupId.value && !isDrawingRoute.value) {
    drawGroupRoute(selectedGroupId.value);
  }
}

function drawGroupRoute(groupId: number) {
  if (!map.value || !order.value?.schools || !order.value.delivery_groups || isDrawingRoute.value) return;

  const group = order.value.delivery_groups.find(g => g.id === groupId);
  if (!group) return;
  
  isDrawingRoute.value = true;

  const schoolsInGroup = order.value.schools
    .filter(s => s.delivery_group_id === groupId)
    .sort((a, b) => (a.route_order || 999) - (b.route_order || 999));

  const routePoints: [number, number][] = [];

  // Add start point if available
  if (group.start_latitude && group.start_longitude) {
    routePoints.push([group.start_latitude, group.start_longitude]);
    
    // Add start marker
    const startMarker = L.marker([group.start_latitude, group.start_longitude])
      .addTo(map.value as L.Map)
      .bindPopup(`<strong>Start: ${group.start_address || group.name}</strong>`);
    startMarker.setIcon(L.icon({
      iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png',
      shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowSize: [41, 41]
    }));
    markers.value.push(startMarker);
  }

  // Collect coordinates from schools/structures in route order
  // For each school, visit ALL its structures before moving to the next school
  for (const school of schoolsInGroup) {
    if (school.is_standalone) {
      // Standalone school - use school coordinates
      if (school.latitude && school.longitude) {
        routePoints.push([school.latitude, school.longitude]);
      }
    } else if (school.structures && school.structures.length > 0) {
      // School with structures - visit ALL structures with coordinates
      const structuresWithCoords = school.structures.filter((s: any) => s.latitude && s.longitude);
      
      // Sort structures by route order if available, otherwise by name
      structuresWithCoords.sort((a: any, b: any) => {
        // You can add route_order to structures later if needed
        return (a.name || '').localeCompare(b.name || '');
      });
      
      // Add all structures for this school
      structuresWithCoords.forEach((structure: any) => {
        routePoints.push([structure.latitude, structure.longitude]);
      });
    }
  }

  // Draw actual road route if we have at least 2 points
  if (routePoints.length >= 2 && map.value) {
    drawRoadRoute(routePoints).finally(() => {
      isDrawingRoute.value = false;
    });
    
    // Fit map to show the entire route (with delay to ensure map is ready)
    setTimeout(() => {
      if (map.value) {
        try {
          const bounds = L.latLngBounds(routePoints);
          (map.value as L.Map).fitBounds(bounds, { padding: [50, 50] });
        } catch (e) {
          // Ignore fitBounds errors
        }
      }
    }, 300);
  } else {
    isDrawingRoute.value = false;
  }
}

async function drawRoadRoute(waypoints: [number, number][]) {
  if (!map.value || waypoints.length < 2) return;

  try {
    // Try Google Maps Directions API first (best quality, prefers highways/main roads)
    // Proxied through backend to avoid CORS and keep API key secure
    // Falls back to GraphHopper, then OSRM if Google fails
    try {
      return await drawRoadRouteGoogle(waypoints);
    } catch (googleError) {
      console.warn('Google Maps routing failed, trying GraphHopper fallback:', googleError);
    }
    
    // Try GraphHopper as second option
    try {
      return await drawRoadRouteGraphHopper(waypoints);
    } catch (ghError) {
      console.warn('GraphHopper routing failed, trying OSRM fallback:', ghError);
      return await drawRoadRouteOSRM(waypoints);
    }
  } catch (error) {
    console.error('Error fetching road route:', error);
    // Fallback to straight line if all routing services fail
    const fallbackPolyline = L.polyline(waypoints, {
      color: '#3b82f6',
      weight: 4,
      opacity: 0.7,
      dashArray: '5, 10'
    }).addTo(map.value as L.Map);
    
    // Add a tooltip explaining this is a fallback
    fallbackPolyline.bindPopup('<strong>Route (Straight Line Fallback)</strong><br>Road routing unavailable');
    
    polylines.value.push(fallbackPolyline);
  }
}

// Primary routing function using Google Maps Directions API - best quality, prefers highways
// Proxied through backend to avoid CORS issues and keep API key secure
async function drawRoadRouteGoogle(waypoints: [number, number][]) {
  if (!map.value || waypoints.length < 2) return;

  // Call backend endpoint which proxies the Google Maps API request
  const response = await fetch(`/api/orders/${orderId.value}/route`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ waypoints })
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(`Google Maps API error: ${response.status} - ${errorData.error || 'Unknown error'}`);
  }

  const data = await response.json();

  if (data.status !== 'OK' || !data.routes || data.routes.length === 0) {
    throw new Error(`Google Maps returned no route: ${data.status}`);
  }

  // Extract route geometry from Google Maps response
  const route = data.routes[0];
  
  // Decode polyline (Google uses encoded polylines)
  const encodedPolyline = route.overview_polyline.points;
  
  // Decode polyline to coordinates
  const routeCoordinates = decodePolyline(encodedPolyline);
  
  // Draw the actual road route
  const routePolyline = L.polyline(routeCoordinates, {
    color: '#3b82f6',
    weight: 5,
    opacity: 0.8,
    smoothFactor: 1
  }).addTo(map.value as L.Map);
  
  // Calculate total distance from all legs
  const distanceKm = route.legs.reduce((sum: number, leg: any) => sum + leg.distance.value, 0) / 1000;
  const durationMinutes = Math.round(route.legs.reduce((sum: number, leg: any) => sum + leg.duration.value, 0) / 60);
  
  // Add route info popup on hover
  routePolyline.bindPopup(`
    <strong>Delivery Route (Google Maps)</strong><br>
    Distance: ${distanceKm.toFixed(1)} km<br>
    Estimated time: ${durationMinutes} minutes<br>
    <small>Route optimized for main roads/highways</small>
  `);

  polylines.value.push(routePolyline);
  
  // Update group distance
  updateGroupDistance(distanceKm);
}

// Helper function to decode Google's encoded polyline
function decodePolyline(encoded: string): [number, number][] {
  const coordinates: [number, number][] = [];
  let index = 0;
  const len = encoded.length;
  let lat = 0;
  let lng = 0;

  while (index < len) {
    let b;
    let shift = 0;
    let result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlat = ((result & 1) !== 0) ? ~(result >> 1) : (result >> 1);
    lat += dlat;

    shift = 0;
    result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlng = ((result & 1) !== 0) ? ~(result >> 1) : (result >> 1);
    lng += dlng;

    coordinates.push([lat / 1e5, lng / 1e5]);
  }

  return coordinates;
}

// Helper function to update group distance (used by all routing functions)
function updateGroupDistance(distanceKm: number) {
  if (!selectedGroupId.value || !order.value) return;
  
  const group = order.value.delivery_groups?.find(g => g.id === selectedGroupId.value);
  if (!group) return;
  
  const existingDistance = group.calculated_distance_km;
  const distanceChanged = !existingDistance || Math.abs(existingDistance - distanceKm) > 0.1;
  
  if (distanceChanged) {
    // Calculate fuel consumption if fuel type and cost are available
    let fuelConsumption = null;
    if (group.fuel_type && group.fuel_cost_per_liter) {
      const fuelConsumptionPer100km = 8; // L/100km
      const distanceForCalculation = group.two_way_km || group.total_km || distanceKm;
      fuelConsumption = (distanceForCalculation / 100) * fuelConsumptionPer100km;
    }
    
    // Update local reactive object first (immediate UI update)
    group.calculated_distance_km = distanceKm;
    group.fuel_consumption = fuelConsumption;
    
    // If editing, update the form data too
    if (editingGroupId.value === selectedGroupId.value) {
      groupData.value.calculated_distance_km = distanceKm;
      groupData.value.fuel_consumption = fuelConsumption;
    }
    
    // Save to database asynchronously with delay to avoid refresh loops
    setTimeout(async () => {
      if (isDrawingRoute.value) return;
      if (!selectedGroupId.value) return;
      if (selectedGroupId.value !== group.id) return;
      
      const currentGroup = order.value?.delivery_groups?.find(g => g.id === group.id);
      if (!currentGroup) return;
      if (currentGroup.calculated_distance_km && 
          Math.abs(currentGroup.calculated_distance_km - distanceKm) < 0.1) {
        return;
      }
      
      try {
        await ordersStore.updateDeliveryGroup(orderId.value, selectedGroupId.value, {
          ...group,
          calculated_distance_km: distanceKm,
          fuel_consumption: fuelConsumption
        });
      } catch (error) {
        console.error('Error saving calculated distance:', error);
      }
    }, 2000);
  } else {
    // Distance already exists, just update fuel consumption if needed
    if (!group.fuel_consumption && group.fuel_type && group.fuel_cost_per_liter) {
      const fuelConsumptionPer100km = 8;
      const distanceForCalculation = group.two_way_km || group.total_km || distanceKm;
      group.fuel_consumption = (distanceForCalculation / 100) * fuelConsumptionPer100km;
    }
  }
}

// Secondary routing function using GraphHopper - prefers highways and main roads
async function drawRoadRouteGraphHopper(waypoints: [number, number][]) {
  if (!map.value || waypoints.length < 2) return;

  // GraphHopper free API - no key required for basic usage
  // Uses 'fastest' profile which prefers highways and main roads
  const points = waypoints.map(point => `${point[0]},${point[1]}`).join('|');
  const ghUrl = `https://graphhopper.com/api/1/route?point=${points}&profile=fastest&points_encoded=false&type=json&key=demo_key`;
  
  const response = await fetch(ghUrl, {
    headers: {
      'User-Agent': 'RoboDoc Delivery Planning',
      'Accept': 'application/json'
    }
  });

  if (!response.ok) {
    throw new Error(`GraphHopper API error: ${response.status}`);
  }

  const data = await response.json();

  if (!data.paths || data.paths.length === 0) {
    throw new Error('GraphHopper returned no route');
  }

  // Extract route geometry from GraphHopper response
  const path = data.paths[0];
  const geometry = path.points.coordinates;
  
  // Convert GeoJSON coordinates [lng, lat] to Leaflet format [lat, lng]
  const routeCoordinates = geometry.map((coord: [number, number]) => [coord[1], coord[0]]) as [number, number][];
  
  // Draw the actual road route
  const routePolyline = L.polyline(routeCoordinates, {
    color: '#3b82f6',
    weight: 5,
    opacity: 0.8,
    smoothFactor: 1
  }).addTo(map.value as L.Map);
  
  // Calculate distance in km
  const distanceKm = path.distance / 1000;
  
  // Add route info popup on hover
  const duration = Math.round(path.time / 60000); // Convert milliseconds to minutes
  routePolyline.bindPopup(`
    <strong>Delivery Route</strong><br>
    Distance: ${distanceKm.toFixed(1)} km<br>
    Estimated time: ${duration} minutes<br>
    <small>Route optimized for main roads/highways</small>
  `);

  polylines.value.push(routePolyline);
  
  // Update group distance
  updateGroupDistance(distanceKm);
}

// Fallback function using OSRM (used if GraphHopper fails)
async function drawRoadRouteOSRM(waypoints: [number, number][]) {
  if (!map.value || waypoints.length < 2) return;

  try {
    // Convert waypoints to "lng,lat" format for OSRM
    const coordinates = waypoints.map(point => `${point[1]},${point[0]}`).join(';');
    
    // Use OSRM routing service as fallback
    const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${coordinates}?overview=full&geometries=geojson`;
    
    const response = await fetch(osrmUrl, {
      headers: {
        'User-Agent': 'RoboDoc Delivery Planning'
      }
    });

    if (!response.ok) {
      throw new Error('Failed to fetch route from OSRM');
    }

    const data = await response.json();

    if (data.code !== 'Ok' || !data.routes || data.routes.length === 0) {
      throw new Error('No route found');
    }

    // Extract route geometry from OSRM response
    const route = data.routes[0];
    const geometry = route.geometry.coordinates;
    
    // Convert GeoJSON coordinates [lng, lat] to Leaflet format [lat, lng]
    const routeCoordinates = geometry.map((coord: [number, number]) => [coord[1], coord[0]]) as [number, number][];
    
    // Draw the actual road route
    const routePolyline = L.polyline(routeCoordinates, {
      color: '#3b82f6',
      weight: 5,
      opacity: 0.8,
      smoothFactor: 1
    }).addTo(map.value as L.Map);
    
    // Calculate distance in km
    const distanceKm = route.distance / 1000;
    
    // Add route info popup on hover
    const duration = Math.round(route.duration / 60); // Convert to minutes
    routePolyline.bindPopup(`
      <strong>Delivery Route (Fallback)</strong><br>
      Distance: ${distanceKm.toFixed(1)} km<br>
      Estimated time: ${duration} minutes<br>
      <small>Using OSRM - may prefer shorter routes</small>
    `);

    polylines.value.push(routePolyline);
    
    // Update group distance
    updateGroupDistance(distanceKm);
  } catch (error) {
    console.error('Error with OSRM fallback:', error);
    // Final fallback to straight line
    const fallbackPolyline = L.polyline(waypoints, {
      color: '#3b82f6',
      weight: 4,
      opacity: 0.7,
      dashArray: '5, 10'
    }).addTo(map.value as L.Map);
    fallbackPolyline.bindPopup('<strong>Route (Straight Line Fallback)</strong><br>Road routing unavailable');
    polylines.value.push(fallbackPolyline);
  }
}

function centerMapOnSchool(school: School) {
  if (!map.value) return;

  // For standalone schools, use school coordinates
  if (school.is_standalone) {
    if (!school.latitude || !school.longitude) {
      alert('School coordinates not available');
      return;
    }
    map.value.setView([school.latitude, school.longitude], 12);
    const marker = markers.value.find(m => {
      const latlng = m.getLatLng();
      return Math.abs(latlng.lat - school.latitude!) < 0.001 && Math.abs(latlng.lng - school.longitude!) < 0.001;
    });
    marker?.openPopup();
  } else {
    // For schools with structures, center on first structure with coordinates
    if (school.structures && school.structures.length > 0) {
      const structureWithCoords = school.structures.find((s: any) => s.latitude && s.longitude);
      if (structureWithCoords && structureWithCoords.latitude && structureWithCoords.longitude) {
        map.value.setView([structureWithCoords.latitude, structureWithCoords.longitude], 12);
        const marker = markers.value.find(m => {
          const latlng = m.getLatLng();
          return Math.abs(latlng.lat - structureWithCoords.latitude!) < 0.001 && 
                 Math.abs(latlng.lng - structureWithCoords.longitude!) < 0.001;
        });
        marker?.openPopup();
      } else {
        alert('No structure coordinates available for this school');
      }
    } else {
      alert('School has no structures with coordinates');
    }
  }
}

function closeGroupModal() {
  showAddGroupModal.value = false;
  editingGroupId.value = null;
  groupData.value = {};
}

function editDeliveryGroup(group: DeliveryGroup) {
  editingGroupId.value = group.id;
  groupData.value = {
    name: group.name,
    description: group.description || '',
    delivery_date: group.delivery_date || '',
    delivery_hour: group.delivery_hour || '',
    start_address: group.start_address || '',
    start_latitude: group.start_latitude || undefined,
    start_longitude: group.start_longitude || undefined,
    fuel_type: group.fuel_type || '',
    fuel_cost_per_liter: group.fuel_cost_per_liter || undefined,
    total_km: group.total_km || undefined,
    two_way_km: group.two_way_km || undefined,
    calculated_distance_km: group.calculated_distance_km || undefined
  };
  showAddGroupModal.value = true;
}

async function saveDeliveryGroup() {
  if (!groupData.value.name?.trim()) {
    alert('Group name is required');
    return;
  }

  savingGroup.value = true;
  try {
    if (editingGroupId.value) {
      // Update existing group
      await ordersStore.updateDeliveryGroup(orderId.value, editingGroupId.value, groupData.value);
    } else {
      // Create new group
      await ordersStore.createDeliveryGroup(orderId.value, groupData.value);
    }
    
    const updatedGroupId = editingGroupId.value;
    await ordersStore.fetchOrder(orderId.value);
    await loadStatistics();
    closeGroupModal();
    
    // If we were editing the currently selected group, refresh map to show updated route
    // Or if we just created a group and have a selected group, refresh map
    if (updatedGroupId && selectedGroupId.value === updatedGroupId) {
      // Keep selection and refresh map to show updated start address/route
      updateMapMarkers();
    } else if (selectedGroupId.value) {
      // Refresh map for any selected group
      updateMapMarkers();
    }
  } catch (error: any) {
    alert(`Error ${editingGroupId.value ? 'updating' : 'creating'} delivery group: ` + (error.message || error));
  } finally {
    savingGroup.value = false;
  }
}

async function confirmDeleteGroup(group: DeliveryGroup) {
  if (!confirm(`Are you sure you want to delete "${group.name}"? All schools assigned to this group will be unassigned.`)) {
    return;
  }

  try {
    await ordersStore.deleteDeliveryGroup(orderId.value, group.id);
    await ordersStore.fetchOrder(orderId.value);
    await loadStatistics();
    
    // Clear selection if deleting selected group
    if (selectedGroupId.value === group.id) {
      selectedGroupId.value = null;
    }
    
    updateMapMarkers();
  } catch (error: any) {
    alert('Error deleting delivery group: ' + (error.message || error));
  }
}

function openScheduleModal(group: DeliveryGroup) {
  selectedGroupForSchedule.value = group;
  scheduleStartTime.value = group.delivery_hour || '';
  documentCheckDuration.value = 20;
  distributionTimePerKit.value = 1;
  showScheduleModal.value = true;
}

interface ScheduleLocation {
  id: number;
  type: 'school' | 'structure';
  name: string;
  schoolName: string;
  city: string;
  kits: number;
  latitude: number | null;
  longitude: number | null;
  inSameBuilding?: boolean;
  scheduled_start_time: string | null;
  document_check_duration: number | null;
  distribution_duration: number | null;
  scheduled_end_time: string | null;
  school?: School;
  structure?: Structure;
}

function getGroupLocationsForSchedule(groupId: number): ScheduleLocation[] {
  if (!order.value?.schools) return [];
  
  const schools = order.value.schools
    .filter(s => s.delivery_group_id === groupId)
    .sort((a, b) => (a.route_order || 999) - (b.route_order || 999));
  
  const locations: ScheduleLocation[] = [];
  
  for (const school of schools) {
    // If standalone school or no structures, add school as location
    if (school.is_standalone || !school.structures || school.structures.length === 0) {
      locations.push({
        id: school.id,
        type: 'school',
        name: school.name,
        schoolName: school.name,
        city: school.city,
        kits: school.calculated_kits || school.kits_count || 0,
        latitude: school.latitude,
        longitude: school.longitude,
        scheduled_start_time: school.scheduled_start_time,
        document_check_duration: school.document_check_duration,
        distribution_duration: school.distribution_duration,
        scheduled_end_time: school.scheduled_end_time,
        school
      });
      continue;
    }
    
    // Check if all structures are in same building
    const allSameBuilding = school.structures.every(s => s.in_same_building);
    
    if (allSameBuilding) {
      // All structures in same building - treat school as single location
      locations.push({
        id: school.id,
        type: 'school',
        name: school.name,
        schoolName: school.name,
        city: school.city,
        kits: school.calculated_kits || school.kits_count || 0,
        latitude: school.latitude,
        longitude: school.longitude,
        scheduled_start_time: school.scheduled_start_time,
        document_check_duration: school.document_check_duration,
        distribution_duration: school.distribution_duration,
        scheduled_end_time: school.scheduled_end_time,
        school
      });
    } else {
      // Add each structure as separate location
      for (const structure of school.structures) {
        locations.push({
          id: structure.id,
          type: 'structure',
          name: structure.name,
          schoolName: school.name,
          city: school.city,
          kits: structure.kits_count || 0,
          latitude: structure.in_same_building ? school.latitude : structure.latitude,
          longitude: structure.in_same_building ? school.longitude : structure.longitude,
          inSameBuilding: structure.in_same_building,
          scheduled_start_time: structure.scheduled_start_time,
          document_check_duration: structure.document_check_duration,
          distribution_duration: structure.distribution_duration,
          scheduled_end_time: structure.scheduled_end_time,
          school,
          structure
        });
      }
    }
  }
  
  return locations;
}

function addMinutes(timeStr: string, minutes: number): string {
  if (!timeStr) return '';
  const [hours, mins] = timeStr.split(':').map(Number);
  const totalMinutes = hours * 60 + mins + minutes;
  const newHours = Math.floor(totalMinutes / 60) % 24;
  const newMins = totalMinutes % 60;
  return `${String(newHours).padStart(2, '0')}:${String(newMins).padStart(2, '0')}`;
}

function getTravelTimeBetweenLocations(fromLocation: ScheduleLocation, toLocation: ScheduleLocation): number {
  if (!fromLocation.latitude || !fromLocation.longitude || !toLocation.latitude || !toLocation.longitude) {
    return 0;
  }

  // Calculate distance using Haversine formula
  const R = 6371; // Earth radius in km
  const dLat = (toLocation.latitude - fromLocation.latitude) * Math.PI / 180;
  const dLng = (toLocation.longitude - fromLocation.longitude) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + 
            Math.cos(fromLocation.latitude * Math.PI / 180) * Math.cos(toLocation.latitude * Math.PI / 180) * 
            Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distanceKm = R * c;

  // Estimate travel time (assume average speed of 50 km/h, or use group's average_speed_kmh)
  const group = selectedGroupForSchedule.value;
  const averageSpeed = group?.average_speed_kmh || 50; // km/h
  const travelTimeMinutes = Math.round((distanceKm / averageSpeed) * 60);

  return travelTimeMinutes;
}

function getTravelTimeToNext(location: ScheduleLocation, index: number): string {
  if (!selectedGroupForSchedule.value) return '-';
  const locations = getGroupLocationsForSchedule(selectedGroupForSchedule.value.id);
  if (index >= locations.length - 1) return '-';
  
  const nextLocation = locations[index + 1];
  const travelTime = getTravelTimeBetweenLocations(location, nextLocation);
  return travelTime > 0 ? `${travelTime} min` : '-';
}

function recalculateSchedule(location: ScheduleLocation, index: number) {
  if (!location.scheduled_start_time) return;
  
  // Calculate end time: start + document check + distribution
  const docCheckDuration = location.document_check_duration || documentCheckDuration.value || 20;
  const distributionDuration = location.distribution_duration || 
    (location.kits * distributionTimePerKit.value);
  
  const totalDuration = docCheckDuration + distributionDuration;
  location.scheduled_end_time = addMinutes(location.scheduled_start_time, totalDuration);

  // Update next location's start time if exists
  if (!selectedGroupForSchedule.value) return;
  const locations = getGroupLocationsForSchedule(selectedGroupForSchedule.value.id);
  if (index < locations.length - 1) {
    const nextLocation = locations[index + 1];
    const travelTime = getTravelTimeBetweenLocations(location, nextLocation);
    if (travelTime > 0 && location.scheduled_end_time) {
      nextLocation.scheduled_start_time = addMinutes(location.scheduled_end_time, travelTime);
      recalculateSchedule(nextLocation, index + 1);
    }
  }
}

async function autoScheduleGroup() {
  if (!selectedGroupForSchedule.value || !scheduleStartTime.value) {
    alert('Please set a start time for the first location');
    return;
  }

  const locations = getGroupLocationsForSchedule(selectedGroupForSchedule.value.id);
  if (locations.length === 0) {
    alert('No locations in this group');
    return;
  }

  let currentTime = scheduleStartTime.value;

  for (let i = 0; i < locations.length; i++) {
    const location = locations[i];
    
    // Set start time
    location.scheduled_start_time = currentTime;
    location.document_check_duration = location.document_check_duration || documentCheckDuration.value || 20;
    
    // Calculate distribution duration based on kits
    location.distribution_duration = location.distribution_duration || (location.kits * distributionTimePerKit.value);
    
    // Calculate end time
    const totalDuration = location.document_check_duration + location.distribution_duration;
    location.scheduled_end_time = addMinutes(currentTime, totalDuration);
    
    // Calculate travel time to next location
    if (i < locations.length - 1) {
      const nextLocation = locations[i + 1];
      const travelTime = getTravelTimeBetweenLocations(location, nextLocation);
      currentTime = addMinutes(location.scheduled_end_time, travelTime);
    }
  }
}

async function saveSchedule() {
  if (!selectedGroupForSchedule.value) return;
  
  savingSchedule.value = true;
  try {
    const locations = getGroupLocationsForSchedule(selectedGroupForSchedule.value.id);
    
    // Save schedule for each location (school or structure)
    for (const location of locations) {
      if (location.type === 'school' && location.school) {
        // Update school
        await ordersStore.updateSchool(orderId.value, location.school.id, {
          ...location.school,
          scheduled_start_time: location.scheduled_start_time || null,
          document_check_duration: location.document_check_duration || 20,
          distribution_duration: location.distribution_duration || null,
          scheduled_end_time: location.scheduled_end_time || null
        });
      } else if (location.type === 'structure' && location.structure && location.school) {
        // Update structure
        await ordersStore.updateStructure(
          orderId.value,
          location.school.id,
          location.structure.id,
          {
            ...location.structure,
            scheduled_start_time: location.scheduled_start_time || null,
            document_check_duration: location.document_check_duration || 20,
            distribution_duration: location.distribution_duration || null,
            scheduled_end_time: location.scheduled_end_time || null
          }
        );
      }
    }
    
    await ordersStore.fetchOrder(orderId.value);
    showScheduleModal.value = false;
    alert('Schedule saved successfully!');
  } catch (error: any) {
    alert('Error saving schedule: ' + (error.message || error));
  } finally {
    savingSchedule.value = false;
  }
}

watch(() => order.value, () => {
  if (order.value && map.value && !isDrawingRoute.value) {
    // Wait for DOM to be ready before updating markers
    // Skip update if we're currently drawing a route to avoid loops
    setTimeout(() => {
      if (map.value && !isDrawingRoute.value) {
        updateMapMarkers();
      }
    }, 150);
  }
}, { deep: false });

onMounted(async () => {
  await ordersStore.fetchOrder(orderId.value);
  await loadStatistics();
  setTimeout(() => {
    initMap();
  }, 100);
});

onUnmounted(() => {
  if (map.value) {
    map.value.remove();
    map.value = null;
  }
});
</script>

