<template>
  <div class="px-4 py-6 sm:px-0">
    <div v-if="loading" class="text-center py-8 text-gray-500">
      Loading order details...
    </div>

    <div v-else-if="!order" class="text-center py-12 bg-white rounded-lg shadow">
      <p class="text-gray-500 mb-4">Order not found</p>
      <router-link
        to="/orders"
        class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 cursor-pointer inline-block"
      >
        Back to Orders
      </router-link>
    </div>

    <div v-else>
      <!-- Order Header -->
      <div class="mb-6">
        <div class="flex justify-between items-start mb-4">
          <div>
            <h2 class="text-3xl font-bold text-gray-900">{{ order.name }}</h2>
            <p class="mt-1 text-sm text-gray-500">Manage schools, structures, and delivery planning</p>
          </div>
          <div class="flex gap-2">
            <router-link
              :to="`/orders/${orderId}/planning`"
              :class="[
                'px-4 py-2 rounded-md cursor-pointer',
                canStartPlanning
                  ? 'bg-green-600 text-white hover:bg-green-700'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              ]"
              :title="canStartPlanning ? 'Start delivery planning' : 'All schools must have kits delivered before planning'"
            >
              Delivery Planning
              <span v-if="!canStartPlanning" class="ml-2 text-xs">({{ schoolsWithoutKits }} waiting)</span>
            </router-link>
            <button
              @click="exportOrder"
              class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 cursor-pointer"
            >
              Export
            </button>
            <router-link
              to="/orders"
              class="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 cursor-pointer"
            >
              Back
            </router-link>
          </div>
        </div>

          <!-- Order Info -->
        <div class="bg-white shadow rounded-lg p-6 mb-6">
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                v-model="orderData.status"
                @change="updateOrder"
                class="w-full border border-gray-300 rounded-md px-3 py-2"
              >
                <option value="draft">Draft</option>
                <option value="planned">Planned</option>
                <option value="in-progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Delivery Month</label>
              <select
                v-model="orderData.delivery_month"
                @change="updateOrder"
                class="w-full border border-gray-300 rounded-md px-3 py-2"
              >
                <option :value="null">-- Select Month --</option>
                <option value="January">January</option>
                <option value="February">February</option>
                <option value="March">March</option>
                <option value="April">April</option>
                <option value="May">May</option>
                <option value="June">June</option>
                <option value="July">July</option>
                <option value="August">August</option>
                <option value="September">September</option>
                <option value="October">October</option>
                <option value="November">November</option>
                <option value="December">December</option>
              </select>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Delivery Year</label>
              <input
                v-model.number="orderData.delivery_year"
                @blur="updateOrder"
                type="number"
                min="2020"
                max="2100"
                class="w-full border border-gray-300 rounded-md px-3 py-2"
                placeholder="e.g., 2024"
              />
            </div>
          </div>
          <div class="mt-4">
            <label class="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              v-model="orderData.notes"
              @blur="updateOrder"
              rows="2"
              class="w-full border border-gray-300 rounded-md px-3 py-2"
              placeholder="Additional notes..."
            />
          </div>
          <div class="mt-4 grid grid-cols-4 gap-4 text-sm">
            <div>
              <span class="font-medium text-gray-700">Schools:</span>
              <span class="ml-2 text-gray-600">{{ order.schools?.length || 0 }}</span>
            </div>
            <div>
              <span class="font-medium text-gray-700">Structures:</span>
              <span class="ml-2 text-gray-600">{{ totalStructures }}</span>
            </div>
            <div>
              <span class="font-medium text-gray-700">Total Kits:</span>
              <span class="ml-2 text-gray-600">{{ totalKits }}</span>
            </div>
            <div>
              <span class="font-medium text-gray-700">Kits Delivered:</span>
              <span
                :class="[
                  'ml-2 font-semibold',
                  canStartPlanning ? 'text-green-600' : 'text-orange-600'
                ]"
              >
                {{ order.schools?.filter(s => s.kits_delivered).length || 0 }} / {{ order.schools?.length || 0 }}
              </span>
              <span v-if="!canStartPlanning" class="ml-2 text-xs text-gray-500">
                ({{ schoolsWithoutKits }} waiting)
              </span>
            </div>
          </div>
        </div>

        <!-- View Toggle -->
        <div class="mb-4 flex justify-between items-center">
          <div class="flex gap-2">
            <button
              @click="viewMode = 'table'"
              :class="[
                'px-4 py-2 rounded-md cursor-pointer',
                viewMode === 'table' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              ]"
            >
              Table View
            </button>
            <button
              @click="viewMode = 'cards'"
              :class="[
                'px-4 py-2 rounded-md cursor-pointer',
                viewMode === 'cards' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              ]"
            >
              Card View
            </button>
          </div>
          <button
            @click="showAddSchoolModal = true"
            class="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 cursor-pointer"
          >
            + Add School
          </button>
        </div>

        <!-- Schools Table View -->
        <div v-if="viewMode === 'table' && order.schools && order.schools.length > 0" class="bg-white shadow rounded-lg overflow-hidden">
          <div class="overflow-x-auto">
            <table class="min-w-full divide-y divide-gray-200">
              <thead class="bg-gray-50">
                <tr>
                  <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">School Name</th>
                  <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Address</th>
                  <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">City</th>
                  <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Protocol Number</th>
                  <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                  <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Kits</th>
                  <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Kits at School
                    <span class="text-xs font-normal text-gray-400 block">(Required for planning)</span>
                  </th>
                  <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Structures</th>
                  <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody class="bg-white divide-y divide-gray-200">
                <template v-for="school in order.schools" :key="school.id">
                  <tr class="hover:bg-gray-50">
                    <td class="px-4 py-3 whitespace-nowrap">
                      <div class="flex items-center gap-2">
                        <button
                          v-if="!school.is_standalone"
                          @click="toggleSchoolExpansion(school.id)"
                          class="text-gray-400 hover:text-gray-600"
                        >
                          <svg
                            class="w-4 h-4 transition-transform"
                            :class="{ 'rotate-90': expandedSchools.has(school.id) }"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                          </svg>
                        </button>
                        <input
                          v-if="editingSchoolId === school.id"
                          v-model="editingSchoolData.name"
                          @blur="saveSchoolInline(school)"
                          @keyup.enter="saveSchoolInline(school)"
                          class="w-full border border-gray-300 rounded-md px-2 py-1 text-sm"
                        />
                        <span
                          v-else
                          @click="startEditSchool(school, 'name')"
                          class="cursor-pointer hover:text-blue-600"
                        >
                          {{ school.name }}
                        </span>
                      </div>
                    </td>
                  <td class="px-4 py-3">
                    <input
                      v-if="editingSchoolId === school.id"
                      v-model="editingSchoolData.address"
                      @blur="saveSchoolInline(school)"
                      @keyup.enter="saveSchoolInline(school)"
                      class="w-full border border-gray-300 rounded-md px-2 py-1 text-sm"
                    />
                    <span
                      v-else
                      @click="startEditSchool(school, 'address')"
                      class="cursor-pointer hover:text-blue-600"
                    >
                      {{ school.address }}
                    </span>
                  </td>
                  <td class="px-4 py-3 whitespace-nowrap">
                    <input
                      v-if="editingSchoolId === school.id"
                      v-model="editingSchoolData.city"
                      @blur="saveSchoolInline(school)"
                      @keyup.enter="saveSchoolInline(school)"
                      class="w-full border border-gray-300 rounded-md px-2 py-1 text-sm"
                    />
                    <span
                      v-else
                      @click="startEditSchool(school, 'city')"
                      class="cursor-pointer hover:text-blue-600"
                    >
                      {{ school.city }}
                    </span>
                  </td>
                  <td class="px-4 py-3 whitespace-nowrap">
                    <input
                      v-if="editingSchoolId === school.id"
                      v-model="editingSchoolData.protocol_number"
                      @blur="saveSchoolInline(school)"
                      @keyup.enter="saveSchoolInline(school)"
                      placeholder="e.g., 14.6/09.09.2025"
                      class="w-full border border-gray-300 rounded-md px-2 py-1 text-sm"
                    />
                    <span
                      v-else
                      @click="startEditSchool(school, 'protocol_number')"
                      :class="[
                        'cursor-pointer',
                        school.protocol_number ? 'text-blue-700 font-semibold' : 'text-red-600'
                      ]"
                    >
                      {{ school.protocol_number || '⚠ Missing' }}
                    </span>
                  </td>
                  <td class="px-4 py-3 text-sm text-gray-600">
                    <div v-if="school.contact_name || school.contact_phone || school.contact_email">
                      <div v-if="school.contact_name" @click="startEditSchool(school, 'contact_name')" class="cursor-pointer hover:text-blue-600">
                        {{ school.contact_name }}
                      </div>
                      <div v-if="school.contact_phone" class="text-xs text-gray-500">{{ school.contact_phone }}</div>
                      <div v-if="school.contact_email" class="text-xs text-gray-500">{{ school.contact_email }}</div>
                    </div>
                    <span v-else class="text-gray-400">-</span>
                  </td>
                  <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                    {{ school.calculated_kits || school.kits_count || 0 }}
                  </td>
                  <td class="px-4 py-3 whitespace-nowrap">
                    <div class="flex items-center gap-2">
                      <input
                        type="checkbox"
                        :checked="school.kits_delivered || false"
                        @change="toggleKitsDelivered(school, $event)"
                        class="rounded border-gray-300 cursor-pointer"
                      />
                      <span
                        v-if="school.kits_delivered"
                        class="text-xs text-green-600 font-medium"
                        title="Kits have been delivered to the school. You can now plan distribution."
                      >
                        ✓ Ready for Planning
                      </span>
                      <span
                        v-else
                        class="text-xs text-gray-400"
                        title="Kits must be delivered to the school before planning can begin."
                      >
                        Waiting for delivery
                      </span>
                    </div>
                  </td>
                  <td class="px-4 py-3 text-sm">
                    <div class="flex items-center gap-2">
                      <span class="text-gray-600">{{ school.structures?.length || 0 }}</span>
                      <button
                        v-if="!school.is_standalone"
                        @click="openAddStructureModal(school)"
                        class="px-2 py-1 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 cursor-pointer text-xs"
                      >
                        + Add
                      </button>
                      <span v-else class="text-xs text-gray-400">Standalone</span>
                    </div>
                  </td>
                  <td class="px-4 py-3 whitespace-nowrap text-sm">
                    <button
                      @click="editSchool(school)"
                      class="px-2 py-1 bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 cursor-pointer text-xs mr-1"
                    >
                      Edit
                    </button>
                    <button
                      @click="deleteSchoolHandler(school)"
                      class="px-2 py-1 bg-red-100 text-red-700 rounded-md hover:bg-red-200 cursor-pointer text-xs"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
                <!-- Expanded Structures Row -->
                <tr v-if="expandedSchools.has(school.id) && !school.is_standalone" class="bg-gray-50">
                  <td colspan="9" class="px-4 py-4">
                    <div class="space-y-3">
                      <div class="flex justify-between items-center mb-3">
                        <h4 class="text-sm font-medium text-gray-900">Structures for {{ school.name }}</h4>
                        <button
                          @click="openAddStructureModal(school)"
                          class="px-3 py-1 bg-green-600 text-white rounded-md hover:bg-green-700 cursor-pointer text-xs"
                        >
                          + Add Structure
                        </button>
                      </div>
                      <div v-if="!school.structures || school.structures.length === 0" class="text-sm text-gray-500 italic py-4 text-center">
                        No structures added yet. Click "+ Add Structure" to add one.
                      </div>
                      <div v-else class="space-y-2">
                        <div
                          v-for="structure in school.structures"
                          :key="structure.id"
                          class="bg-white border border-gray-200 rounded-md p-3 flex justify-between items-start"
                        >
                          <div class="flex-1">
                            <div class="font-medium text-sm text-gray-900 mb-1">{{ structure.name }}</div>
                            <div v-if="structure.address" class="text-xs text-gray-600 mb-1">{{ structure.address }}</div>
                            <div class="flex gap-4 text-xs text-gray-600">
                              <span><span class="font-medium">Kits:</span> {{ structure.kits_count || 0 }}</span>
                              <span v-if="structure.latitude && structure.longitude">
                                📍 {{ structure.latitude.toFixed(6) }}, {{ structure.longitude.toFixed(6) }}
                              </span>
                              <span v-else class="text-gray-400 italic">No coordinates</span>
                              <span v-if="structure.in_same_building" class="text-blue-600">Same building as school</span>
                            </div>
                          </div>
                          <div class="flex gap-2 ml-4">
                            <button
                              @click="editStructure(structure, school)"
                              class="px-2 py-1 bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 cursor-pointer text-xs"
                            >
                              Edit
                            </button>
                            <button
                              @click="deleteStructureHandler(structure, school)"
                              class="px-2 py-1 bg-red-100 text-red-700 rounded-md hover:bg-red-200 cursor-pointer text-xs"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </td>
                </tr>
                </template>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Schools Card View (Original) -->
        <div v-if="viewMode === 'cards' && (!order.schools || order.schools.length === 0)" class="bg-white shadow rounded-lg p-12 text-center">
          <p class="text-gray-500 mb-4">No schools added yet. Add your first school to get started.</p>
          <button
            @click="showAddSchoolModal = true"
            class="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 cursor-pointer"
          >
            Add School
          </button>
        </div>

        <div v-if="viewMode === 'cards' && order.schools && order.schools.length > 0" class="space-y-6">
          <div
            v-for="school in order.schools"
            :key="school.id"
            class="bg-white shadow rounded-lg p-6"
          >
            <div class="flex justify-between items-start mb-4">
              <div class="flex-1">
                <h3 class="text-xl font-semibold text-gray-900 mb-2">{{ school.name }}</h3>
                <div class="text-sm text-gray-600 space-y-1">
                  <div><span class="font-medium">Address:</span> {{ school.address }}, {{ school.city }}</div>
                  <div v-if="school.protocol_number" class="text-blue-700 font-semibold">
                    <span class="font-medium">Protocol Number:</span> {{ school.protocol_number }}
                  </div>
                  <div v-else class="text-red-600 font-semibold">
                    <span class="font-medium">⚠ Protocol Number:</span> Missing (required for distribution)
                  </div>
                  <div v-if="school.contact_name">
                    <span class="font-medium">Contact:</span> {{ school.contact_name }}
                    <span v-if="school.contact_phone"> - {{ school.contact_phone }}</span>
                    <span v-if="school.contact_email"> - {{ school.contact_email }}</span>
                  </div>
                  <div>
                    <span class="font-medium">Kits:</span> {{ school.calculated_kits || school.kits_count || 0 }}
                    <span v-if="school.structures" class="text-gray-500">
                      ({{ school.structures.length }} structures)
                    </span>
                  </div>
                  <div v-if="school.city_type">
                    <span class="font-medium">City Type:</span> {{ school.city_type }}
                  </div>
                  <div v-if="school.is_standalone" class="text-green-600">
                    <span class="font-medium">✓ Standalone School</span> (no structures)
                  </div>
                  <div v-if="school.is_standalone && school.latitude && school.longitude" class="text-xs text-gray-500 mt-1">
                    📍 {{ school.latitude.toFixed(6) }}, {{ school.longitude.toFixed(6) }}
                  </div>
                  <div v-if="school.delivery_group_name" class="text-blue-600">
                    <span class="font-medium">Delivery Group:</span> {{ school.delivery_group_name }}
                  </div>
                </div>
              </div>
              <div class="flex gap-2 ml-4">
                <button
                  @click="editSchool(school)"
                  class="px-3 py-1 bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 cursor-pointer text-sm"
                >
                  Edit
                </button>
                <button
                  @click="deleteSchoolHandler(school)"
                  class="px-3 py-1 bg-red-100 text-red-700 rounded-md hover:bg-red-200 cursor-pointer text-sm"
                >
                  Delete
                </button>
              </div>
            </div>

            <!-- Structures -->
            <div v-if="!school.is_standalone" class="mt-4 pl-4 border-l-2 border-gray-200">
              <div class="flex justify-between items-center mb-2">
                <h4 class="text-sm font-medium text-gray-700">Structures</h4>
                <button
                  @click="openAddStructureModal(school)"
                  class="px-2 py-1 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 cursor-pointer text-xs"
                >
                  + Add Structure
                </button>
              </div>
              <div v-if="!school.structures || school.structures.length === 0" class="text-sm text-gray-500 italic">
                No structures added yet
              </div>
              <div v-else class="space-y-2">
                <div
                  v-for="structure in school.structures"
                  :key="structure.id"
                  class="bg-gray-50 rounded p-3 flex justify-between items-center"
                >
                  <div>
                    <div class="font-medium text-sm text-gray-900">{{ structure.name }}</div>
                    <div v-if="structure.address" class="text-xs text-gray-600 mt-1">{{ structure.address }}</div>
                    <div class="text-xs text-gray-600 mt-1">
                      <span class="font-medium">Kits:</span> {{ structure.kits_count || 0 }}
                    </div>
                    <div v-if="structure.latitude && structure.longitude" class="text-xs text-gray-500 mt-1">
                      📍 {{ structure.latitude.toFixed(6) }}, {{ structure.longitude.toFixed(6) }}
                    </div>
                    <div v-else class="text-xs text-gray-400 mt-1 italic">
                      No coordinates set
                    </div>
                  </div>
                  <div class="flex gap-2">
                    <button
                      @click="editStructure(structure, school)"
                      class="px-2 py-1 bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 cursor-pointer text-xs"
                    >
                      Edit
                    </button>
                    <button
                      @click="deleteStructureHandler(structure, school)"
                      class="px-2 py-1 bg-red-100 text-red-700 rounded-md hover:bg-red-200 cursor-pointer text-xs"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Add/Edit School Modal -->
    <div
      v-if="showAddSchoolModal || editingSchool"
      class="fixed inset-0 bg-gray-600/75 overflow-y-auto h-full w-full z-50"
      @click.self="closeSchoolModal"
    >
      <div class="relative top-20 mx-auto p-6 border w-full max-w-2xl shadow-lg rounded-md bg-white max-h-[90vh] overflow-y-auto">
        <div class="flex justify-between items-center mb-4">
          <h3 class="text-lg font-medium text-gray-900">
            {{ editingSchool ? 'Edit School' : 'Add School' }}
          </h3>
          <button
            type="button"
            @click="closeSchoolModal"
            class="text-gray-400 hover:text-gray-600 cursor-pointer"
          >
            ✕
          </button>
        </div>

        <form @submit.prevent="saveSchool" class="space-y-4">
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">School Name *</label>
              <input
                v-model="schoolData.name"
                type="text"
                required
                class="w-full border border-gray-300 rounded-md px-3 py-2"
                placeholder="School name"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">City *</label>
              <input
                v-model="schoolData.city"
                type="text"
                required
                class="w-full border border-gray-300 rounded-md px-3 py-2"
                placeholder="City"
              />
            </div>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Address *</label>
            <input
              v-model="schoolData.address"
              type="text"
              required
              class="w-full border border-gray-300 rounded-md px-3 py-2"
              placeholder="School address"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Protocol Number *</label>
            <input
              v-model="schoolData.protocol_number"
              type="text"
              required
              class="w-full border border-gray-300 rounded-md px-3 py-2"
              placeholder="e.g., 14.6/09.09.2025"
            />
            <p class="text-xs text-gray-500 mt-1">Required: Distribution cannot proceed without a signed protocol/contract number (format: number.number/date)</p>
          </div>

          <div class="grid grid-cols-3 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Contact Name</label>
              <input
                v-model="schoolData.contact_name"
                type="text"
                class="w-full border border-gray-300 rounded-md px-3 py-2"
                placeholder="Contact name"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Contact Phone</label>
              <input
                v-model="schoolData.contact_phone"
                type="tel"
                class="w-full border border-gray-300 rounded-md px-3 py-2"
                placeholder="Phone"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Contact Email</label>
              <input
                v-model="schoolData.contact_email"
                type="email"
                class="w-full border border-gray-300 rounded-md px-3 py-2"
                placeholder="Email"
              />
            </div>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">City Type</label>
              <select v-model="schoolData.city_type" class="w-full border border-gray-300 rounded-md px-3 py-2">
                <option :value="null">-- Select --</option>
                <option value="urban">Urban</option>
                <option value="rural">Rural</option>
                <option value="urban-small">Urban Small</option>
                <option value="urban-large">Urban Large</option>
              </select>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Kits Count (informative)</label>
              <input
                v-model.number="schoolData.kits_count"
                type="number"
                min="0"
                class="w-full border border-gray-300 rounded-md px-3 py-2"
                placeholder="Rough estimate or calculated from structures"
              />
            </div>
          </div>

          <div class="mb-4">
            <label class="flex items-center">
              <input
                v-model="schoolData.is_standalone"
                type="checkbox"
                class="mr-2 rounded border-gray-300"
              />
              <span class="text-sm font-medium text-gray-700">Standalone School (no structures - deliver directly to school)</span>
            </label>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Latitude (for map - optional for standalone)</label>
              <input
                v-model.number="schoolData.latitude"
                type="number"
                step="any"
                class="w-full border border-gray-300 rounded-md px-3 py-2"
                placeholder="Optional"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Longitude (for map - optional for standalone)</label>
              <input
                v-model.number="schoolData.longitude"
                type="number"
                step="any"
                class="w-full border border-gray-300 rounded-md px-3 py-2"
                placeholder="Optional"
              />
            </div>
          </div>

          <div class="flex justify-end gap-2 pt-4">
            <button
              type="button"
              @click="closeSchoolModal"
              class="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              :disabled="savingSchool"
              class="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 cursor-pointer disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {{ savingSchool ? 'Saving...' : 'Save School' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Add/Edit Structure Modal -->
    <div
      v-if="showAddStructureModal || editingStructure"
      class="fixed inset-0 bg-gray-600/75 overflow-y-auto h-full w-full z-50"
      @click.self="closeStructureModal"
    >
      <div class="relative top-20 mx-auto p-6 border w-full max-w-xl shadow-lg rounded-md bg-white">
        <div class="flex justify-between items-center mb-4">
          <div>
            <h3 class="text-lg font-medium text-gray-900">
              {{ editingStructure ? 'Edit Structure' : 'Add Structure' }}
            </h3>
            <p v-if="selectedSchool" class="text-sm text-gray-500 mt-1">
              School: {{ selectedSchool.name }}
            </p>
          </div>
          <button
            type="button"
            @click="closeStructureModal"
            class="text-gray-400 hover:text-gray-600 cursor-pointer"
          >
            ✕
          </button>
        </div>

        <form @submit.prevent="saveStructure" class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Structure Name *</label>
            <input
              v-model="structureData.name"
              type="text"
              required
              class="w-full border border-gray-300 rounded-md px-3 py-2"
              placeholder="e.g., Kindergarten A"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Address</label>
            <input
              v-model="structureData.address"
              type="text"
              class="w-full border border-gray-300 rounded-md px-3 py-2"
              placeholder="Structure address (city inherited from school)"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Number of Kids/Kits</label>
            <input
              v-model.number="structureData.kits_count"
              type="number"
              min="0"
              class="w-full border border-gray-300 rounded-md px-3 py-2"
              placeholder="Will be confirmed later (optional for now)"
            />
          </div>

          <div class="bg-gray-50 p-3 rounded-md">
            <label class="flex items-center cursor-pointer">
              <input
                v-model="structureData.in_same_building"
                type="checkbox"
                class="rounded mr-2"
                @change="handleInSameBuildingChange"
              />
              <span class="text-sm font-medium text-gray-700">In Same Building as School</span>
            </label>
            <p class="text-xs text-gray-500 mt-1 ml-6">
              If checked, this structure will use the school's address and map coordinates
            </p>
          </div>

          <div class="grid grid-cols-2 gap-4" :class="{ 'opacity-50': structureData.in_same_building }">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">
                Latitude (for map)
                <span v-if="structureData.in_same_building" class="text-xs text-gray-500">(using school's)</span>
              </label>
              <input
                v-model.number="structureData.latitude"
                type="number"
                step="any"
                :disabled="structureData.in_same_building"
                class="w-full border border-gray-300 rounded-md px-3 py-2 disabled:bg-gray-100"
                placeholder="Optional"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">
                Longitude (for map)
                <span v-if="structureData.in_same_building" class="text-xs text-gray-500">(using school's)</span>
              </label>
              <input
                v-model.number="structureData.longitude"
                type="number"
                step="any"
                :disabled="structureData.in_same_building"
                class="w-full border border-gray-300 rounded-md px-3 py-2 disabled:bg-gray-100"
                placeholder="Optional"
              />
            </div>
          </div>

          <div class="flex justify-end gap-2 pt-4">
            <button
              type="button"
              @click="closeStructureModal"
              class="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              :disabled="savingStructure"
              class="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 cursor-pointer disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {{ savingStructure ? 'Saving...' : 'Save Structure' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useRoute } from 'vue-router';
import { useOrdersStore } from '@/stores/orders';
import type { OrderStatus, School, Structure } from '@/types/order';
import * as XLSX from 'xlsx';

const route = useRoute();
const ordersStore = useOrdersStore();

const orderId = computed(() => parseInt(route.params.id as string));
const order = computed(() => ordersStore.currentOrder);
const loading = computed(() => ordersStore.loading);

const orderData = ref<{
  name: string;
  delivery_month: string | null;
  delivery_year: number | null;
  status: OrderStatus;
  notes: string;
}>({
  name: '',
  delivery_month: null,
  delivery_year: null,
  status: 'draft',
  notes: ''
});

const showAddSchoolModal = ref(false);
const editingSchool = ref<School | null>(null);
const schoolData = ref<Partial<School>>({});
const savingSchool = ref(false);

const showAddStructureModal = ref(false);
const selectedSchool = ref<School | null>(null);
const editingStructure = ref<Structure | null>(null);
const structureData = ref<Partial<Structure>>({});
const savingStructure = ref(false);

// Table view and inline editing
const viewMode = ref<'table' | 'cards'>('table');
const editingSchoolId = ref<number | null>(null);
const editingSchoolData = ref<Partial<School>>({});
const editingField = ref<string | null>(null);
const expandedSchools = ref<Set<number>>(new Set());

const totalStructures = computed(() => {
  if (!order.value?.schools) return 0;
  return order.value.schools.reduce((sum, school) => sum + (school.structures?.length || 0), 0);
});

const totalKits = computed(() => {
  if (!order.value?.schools) return 0;
  return order.value.schools.reduce((sum, school) => sum + (school.calculated_kits || school.kits_count || 0), 0);
});

const canStartPlanning = computed(() => {
  if (!order.value?.schools || order.value.schools.length === 0) return false;
  return order.value.schools.every(school => school.kits_delivered);
});

const schoolsWithoutKits = computed(() => {
  if (!order.value?.schools) return 0;
  return order.value.schools.filter(school => !school.kits_delivered).length;
});

watch(() => order.value, (newOrder) => {
  if (newOrder) {
    orderData.value = {
      name: newOrder.name,
      delivery_month: newOrder.delivery_month || null,
      delivery_year: newOrder.delivery_year || null,
      status: newOrder.status,
      notes: newOrder.notes || ''
    };
  }
}, { immediate: true });

onMounted(async () => {
  await ordersStore.fetchOrder(orderId.value);
});

async function updateOrder() {
  try {
    await ordersStore.updateOrder(orderId.value, orderData.value);
  } catch (error: any) {
    alert('Error updating order: ' + (error.message || error));
  }
}

function startEditSchool(school: School, field: string) {
  if (editingSchoolId.value === school.id && editingField.value === field) {
    // Already editing this field, do nothing
    return;
  }
  editingSchoolId.value = school.id;
  editingField.value = field;
  editingSchoolData.value = { ...school };
}

async function saveSchoolInline(school: School) {
  if (!editingSchoolId.value || editingSchoolId.value !== school.id) return;
  
  // Validate required fields
  if (!editingSchoolData.value.name || !editingSchoolData.value.address || !editingSchoolData.value.city) {
    alert('School name, address, and city are required');
    editingSchoolId.value = null;
    editingField.value = null;
    editingSchoolData.value = {};
    return;
  }
  
  try {
    // Merge with original school data to preserve all fields
    const updateData = {
      ...school,
      ...editingSchoolData.value,
      // Ensure boolean fields are properly set
      is_standalone: editingSchoolData.value.is_standalone ?? school.is_standalone,
      kits_delivered: editingSchoolData.value.kits_delivered ?? school.kits_delivered
    };
    
    await ordersStore.updateSchool(orderId.value, school.id, updateData);
    editingSchoolId.value = null;
    editingField.value = null;
    editingSchoolData.value = {};
    await ordersStore.fetchOrder(orderId.value);
  } catch (error: any) {
    alert('Error updating school: ' + (error.message || error));
    editingSchoolId.value = null;
    editingField.value = null;
    editingSchoolData.value = {};
  }
}

async function toggleKitsDelivered(school: School, event: Event) {
  const checked = (event.target as HTMLInputElement).checked;
  try {
    // Include all school fields to preserve them when updating
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
      delivery_group_id: school.delivery_group_id,
      delivery_status: school.delivery_status,
      delivery_notes: school.delivery_notes,
      route_order: school.route_order,
      scheduled_start_time: school.scheduled_start_time,
      document_check_duration: school.document_check_duration,
      distribution_duration: school.distribution_duration,
      scheduled_end_time: school.scheduled_end_time,
      protocol_number: school.protocol_number,
      kits_delivered: checked
    });
    await ordersStore.fetchOrder(orderId.value);
  } catch (error: any) {
    alert('Error updating kits delivered status: ' + (error.message || error));
    // Revert checkbox on error
    (event.target as HTMLInputElement).checked = !checked;
  }
}

function toggleSchoolExpansion(schoolId: number) {
  if (expandedSchools.value.has(schoolId)) {
    expandedSchools.value.delete(schoolId);
  } else {
    expandedSchools.value.add(schoolId);
  }
}

function editSchool(school: School) {
  editingSchool.value = school;
  // Ensure boolean values are properly converted (SQLite stores booleans as 0/1)
  schoolData.value = {
    ...school,
    is_standalone: school.is_standalone === true || school.is_standalone === 1,
    kits_delivered: school.kits_delivered === true || school.kits_delivered === 1
  };
  showAddSchoolModal.value = true;
}

function closeSchoolModal() {
  showAddSchoolModal.value = false;
  editingSchool.value = null;
  schoolData.value = {};
}

async function saveSchool() {
  // Validate required fields including protocol_number
  if (!schoolData.value.name || !schoolData.value.address || !schoolData.value.city) {
    alert('School name, address, and city are required');
    return;
  }
  
  if (!schoolData.value.protocol_number || !schoolData.value.protocol_number.trim()) {
    alert('Protocol number is required. Distribution cannot proceed without a signed protocol/contract number.');
    return;
  }

  savingSchool.value = true;
  try {
    if (editingSchool.value) {
      // When editing, merge with original school data to preserve all fields
      const updateData = {
        ...editingSchool.value,
        ...schoolData.value,
        // Ensure boolean fields are properly converted
        is_standalone: schoolData.value.is_standalone === true || schoolData.value.is_standalone === 1,
        kits_delivered: schoolData.value.kits_delivered === true || schoolData.value.kits_delivered === 1
      };
      await ordersStore.updateSchool(orderId.value, editingSchool.value.id, updateData);
    } else {
      // When creating, ensure boolean fields are properly set
      const createData = {
        ...schoolData.value,
        is_standalone: schoolData.value.is_standalone === true || schoolData.value.is_standalone === 1,
        kits_delivered: schoolData.value.kits_delivered === true || schoolData.value.kits_delivered === 1
      };
      await ordersStore.createSchool(orderId.value, createData);
    }
    closeSchoolModal();
    await ordersStore.fetchOrder(orderId.value);
  } catch (error: any) {
    alert('Error saving school: ' + (error.message || error));
  } finally {
    savingSchool.value = false;
  }
}

async function deleteSchoolHandler(school: School) {
  if (!confirm(`Are you sure you want to delete "${school.name}"? This will also delete all its structures.`)) {
    return;
  }

  try {
    await ordersStore.deleteSchool(orderId.value, school.id);
    await ordersStore.fetchOrder(orderId.value);
  } catch (error: any) {
    alert('Error deleting school: ' + (error.message || error));
  }
}

function openAddStructureModal(school: School) {
  if (!school || !school.id) {
    console.error('Invalid school passed to openAddStructureModal:', school);
    alert('Error: Invalid school selected');
    return;
  }
  // Create a copy to ensure we have a valid reference
  selectedSchool.value = { ...school };
  editingStructure.value = null;
  structureData.value = {
    name: '',
    address: null,
    kits_count: 0,
    latitude: null,
    longitude: null,
    in_same_building: false
  };
  showAddStructureModal.value = true;
}

function editStructure(structure: Structure, school: School) {
  if (!school || !school.id) {
    console.error('Invalid school passed to editStructure:', school);
    alert('Error: Invalid school selected');
    return;
  }
  editingStructure.value = structure;
  selectedSchool.value = { ...school }; // Create a copy to ensure we have a valid reference
  structureData.value = { 
    ...structure,
    latitude: structure.latitude ?? null,
    longitude: structure.longitude ?? null
  };
  showAddStructureModal.value = true;
}

function closeStructureModal() {
  showAddStructureModal.value = false;
  selectedSchool.value = null;
  editingStructure.value = null;
  structureData.value = {
    name: '',
    address: null,
    kits_count: 0,
    latitude: null,
    longitude: null,
    in_same_building: false
  };
}

function handleInSameBuildingChange() {
  if (structureData.value.in_same_building && selectedSchool.value) {
    // Copy school's address and coordinates
    structureData.value.address = selectedSchool.value.address || null;
    structureData.value.latitude = selectedSchool.value.latitude ?? null;
    structureData.value.longitude = selectedSchool.value.longitude ?? null;
  } else {
    // Clear coordinates if unchecked
    structureData.value.latitude = null;
    structureData.value.longitude = null;
  }
}

async function saveStructure() {
  if (!selectedSchool.value) {
    alert('Error: School not selected. Please try again.');
    return;
  }

  const schoolId = selectedSchool.value.id;
  if (!schoolId) {
    alert('Error: Invalid school. Please try again.');
    closeStructureModal();
    return;
  }

  // Store schoolId before any async operations
  const savedSchoolId = schoolId;

  // Ensure latitude and longitude are always defined (can be null)
  const structurePayload = {
    ...structureData.value,
    latitude: structureData.value.latitude ?? null,
    longitude: structureData.value.longitude ?? null,
    in_same_building: structureData.value.in_same_building ?? false
  };

  savingStructure.value = true;
  try {
    if (editingStructure.value && editingStructure.value.id) {
      await ordersStore.updateStructure(
        orderId.value,
        savedSchoolId,
        editingStructure.value.id,
        structurePayload
      );
    } else {
      await ordersStore.createStructure(orderId.value, savedSchoolId, structurePayload);
    }
    
    // Keep the school expanded after adding/editing structure (before closing modal)
    if (!expandedSchools.value.has(savedSchoolId)) {
      expandedSchools.value.add(savedSchoolId);
    }
    
    // Close modal first to prevent any reactivity issues
    closeStructureModal();
    
    // Then refresh data
    await ordersStore.fetchOrder(orderId.value);
  } catch (error: any) {
    console.error('Error saving structure:', error);
    const errorMessage = error?.response?.data?.error || error?.message || 'Unknown error occurred';
    alert('Error saving structure: ' + errorMessage);
  } finally {
    savingStructure.value = false;
  }
}

async function deleteStructureHandler(structure: Structure, school: School) {
  if (!confirm(`Are you sure you want to delete "${structure.name}"?`)) {
    return;
  }

  try {
    await ordersStore.deleteStructure(orderId.value, school.id, structure.id);
    await ordersStore.fetchOrder(orderId.value);
    // Keep the school expanded after deletion
    if (!expandedSchools.value.has(school.id)) {
      expandedSchools.value.add(school.id);
    }
  } catch (error: any) {
    alert('Error deleting structure: ' + (error.message || error));
  }
}

async function exportOrder() {
  try {
    const data = await ordersStore.exportOrder(orderId.value, 'xlsx');
    
    const wb = XLSX.utils.book_new();
    
    const orderData = [
      ['Order Name', data.order.name],
      ['Delivery Month', data.order.delivery_month || ''],
      ['Delivery Year', data.order.delivery_year || ''],
      ['Status', data.order.status],
      ['Notes', data.order.notes || '']
    ];
    const orderWs = XLSX.utils.aoa_to_sheet(orderData);
    XLSX.utils.book_append_sheet(wb, orderWs, 'Order');

    const schoolsData = data.schools.map((school: any) => ({
      'School Name': school.name,
      'Address': school.address,
      'City': school.city,
      'Contact Name': school.contact_name || '',
      'Contact Phone': school.contact_phone || '',
      'Contact Email': school.contact_email || '',
      'Kits Count': school.kits_count || 0,
      'City Type': school.city_type || '',
      'Delivery Group': school.delivery_group_name || ''
    }));
    const schoolsWs = XLSX.utils.json_to_sheet(schoolsData);
    XLSX.utils.book_append_sheet(wb, schoolsWs, 'Schools');

    const structuresData: any[] = [];
    data.schools.forEach((school: any) => {
      (school.structures || []).forEach((structure: any) => {
        structuresData.push({
          'School Name': school.name,
          'Structure Name': structure.name,
          'Address': structure.address || '',
          'Kits Count': structure.kits_count || 0
        });
      });
    });
    const structuresWs = XLSX.utils.json_to_sheet(structuresData);
    XLSX.utils.book_append_sheet(wb, structuresWs, 'Structures');

    XLSX.writeFile(wb, `Order_${data.order.name.replace(/\s+/g, '_')}.xlsx`);
  } catch (error: any) {
    alert('Error exporting order: ' + (error.message || error));
  }
}
</script>

