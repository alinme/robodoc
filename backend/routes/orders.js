import express from 'express';
import { dbRun, dbGet, dbAll } from '../services/database.js';

const router = express.Router();

// GET /api/orders - Get all orders
router.get('/', async (req, res) => {
  try {
    const orders = await dbAll(
      `SELECT o.*, 
       COUNT(DISTINCT s.id) as school_count,
       COUNT(DISTINCT st.id) as structure_count,
       COALESCE(SUM(st.kits_count), 0) as total_kits
       FROM orders o
       LEFT JOIN schools s ON o.id = s.order_id
       LEFT JOIN structures st ON s.id = st.school_id
       GROUP BY o.id
       ORDER BY o.created_at DESC`
    );

    res.json({ success: true, orders });
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/orders/:id - Get single order with schools and structures
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const order = await dbGet('SELECT * FROM orders WHERE id = ?', [id]);
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Get schools with their structures
    const schools = await dbAll(
      `SELECT s.*, 
       COALESCE(SUM(st.kits_count), 0) as calculated_kits,
       COUNT(st.id) as structure_count,
       dg.name as delivery_group_name
       FROM schools s
       LEFT JOIN structures st ON s.id = st.school_id
       LEFT JOIN delivery_groups dg ON s.delivery_group_id = dg.id
       WHERE s.order_id = ?
       GROUP BY s.id
       ORDER BY COALESCE(s.route_order, 999999), s.name`,
      [id]
    );

    // Get structures for each school
    for (const school of schools) {
      const structures = await dbAll(
        'SELECT * FROM structures WHERE school_id = ? ORDER BY name',
        [school.id]
      );
      school.structures = structures;
    }

    // Get delivery groups
    const deliveryGroups = await dbAll(
      'SELECT * FROM delivery_groups WHERE order_id = ? ORDER BY name',
      [id]
    );

    res.json({
      success: true,
      order: {
        ...order,
        schools,
        delivery_groups: deliveryGroups
      }
    });
  } catch (error) {
    console.error('Error fetching order:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/orders - Create new order
router.post('/', async (req, res) => {
  try {
    const { name, delivery_month, delivery_year, status, notes } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Order name is required' });
    }

    const result = await dbRun(
      `INSERT INTO orders (name, delivery_month, delivery_year, status, notes)
       VALUES (?, ?, ?, ?, ?)`,
      [name, delivery_month || null, delivery_year || null, status || 'draft', notes || null]
    );

    const order = await dbGet('SELECT * FROM orders WHERE id = ?', [result.lastID]);
    res.json({ success: true, order });
  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/orders/:id - Update order
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, delivery_month, delivery_year, status, notes } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Order name is required' });
    }

    await dbRun(
      `UPDATE orders SET name = ?, delivery_month = ?, delivery_year = ?, 
       status = ?, notes = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [name, delivery_month || null, delivery_year || null, status || 'draft', notes || null, id]
    );

    const order = await dbGet('SELECT * FROM orders WHERE id = ?', [id]);
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    res.json({ success: true, order });
  } catch (error) {
    console.error('Error updating order:', error);
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/orders/:id - Delete order (cascades to schools and structures)
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await dbRun('DELETE FROM orders WHERE id = ?', [id]);
    
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    res.json({ success: true, deleted: result.changes });
  } catch (error) {
    console.error('Error deleting order:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/orders/:orderId/schools - Create school
router.post('/:orderId/schools', async (req, res) => {
  try {
    const { orderId } = req.params;
    const { name, address, city, contact_name, contact_phone, contact_email, kits_count, city_type, latitude, longitude, is_standalone, delivery_status, delivery_notes, route_order, protocol_number, kits_delivered } = req.body;

    if (!name || !address || !city) {
      return res.status(400).json({ error: 'School name, address, and city are required' });
    }

    // Verify order exists
    const order = await dbGet('SELECT id FROM orders WHERE id = ?', [orderId]);
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const result = await dbRun(
      `INSERT INTO schools (order_id, name, address, city, contact_name, contact_phone, contact_email, 
       kits_count, city_type, latitude, longitude, is_standalone, delivery_status, delivery_notes, route_order, protocol_number, kits_delivered)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [orderId, name, address, city, contact_name || null, contact_phone || null, contact_email || null,
       kits_count || 0, city_type || null, latitude || null, longitude || null, is_standalone ? 1 : 0,
       delivery_status || 'planned', delivery_notes || null, route_order || null, protocol_number || null, kits_delivered ? 1 : 0]
    );

    const school = await dbGet('SELECT * FROM schools WHERE id = ?', [result.lastID]);
    res.json({ success: true, school });
  } catch (error) {
    console.error('Error creating school:', error);
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/orders/:orderId/schools/:schoolId - Update school
router.put('/:orderId/schools/:schoolId', async (req, res) => {
  try {
    const { orderId, schoolId } = req.params;
    const { name, address, city, contact_name, contact_phone, contact_email, kits_count, city_type, latitude, longitude, is_standalone, delivery_group_id, delivery_status, delivery_notes, route_order, scheduled_start_time, document_check_duration, distribution_duration, scheduled_end_time, protocol_number, kits_delivered } = req.body;

    if (!name || !address || !city) {
      return res.status(400).json({ error: 'School name, address, and city are required' });
    }

    // Verify school belongs to order
    const school = await dbGet('SELECT id FROM schools WHERE id = ? AND order_id = ?', [schoolId, orderId]);
    if (!school) {
      return res.status(404).json({ error: 'School not found in this order' });
    }

    // If kits_count is explicitly provided (not null/undefined), use it
    // Otherwise, calculate from structures
    let finalKitsCount = kits_count;
    if (finalKitsCount === null || finalKitsCount === undefined || finalKitsCount === '') {
      // Auto-calculate from structures if not provided
      const structures = await dbAll('SELECT SUM(kits_count) as total FROM structures WHERE school_id = ?', [schoolId]);
      finalKitsCount = structures[0]?.total || 0;
    } else {
      // Use the provided value (convert to number)
      finalKitsCount = Number(kits_count) || 0;
    }

    await dbRun(
      `UPDATE schools SET name = ?, address = ?, city = ?, contact_name = ?, contact_phone = ?, 
       contact_email = ?, kits_count = ?, city_type = ?, latitude = ?, longitude = ?, 
       is_standalone = ?, delivery_group_id = ?, delivery_status = ?, delivery_notes = ?, 
       route_order = ?, scheduled_start_time = ?, document_check_duration = ?, 
       distribution_duration = ?, scheduled_end_time = ?, protocol_number = ?, kits_delivered = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [name, address, city, contact_name || null, contact_phone || null, contact_email || null,
       finalKitsCount, city_type || null, latitude || null, longitude || null,
       is_standalone ? 1 : 0, delivery_group_id || null, delivery_status || 'planned', 
       delivery_notes || null, route_order || null, scheduled_start_time || null, 
       document_check_duration || 20, distribution_duration || null, scheduled_end_time || null, protocol_number || null, kits_delivered ? 1 : 0, schoolId]
    );

    const finalSchool = await dbGet('SELECT * FROM schools WHERE id = ?', [schoolId]);

    res.json({ success: true, school: finalSchool });
  } catch (error) {
    console.error('Error updating school:', error);
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/orders/:orderId/schools/:schoolId - Delete school (cascades to structures)
router.delete('/:orderId/schools/:schoolId', async (req, res) => {
  try {
    const { orderId, schoolId } = req.params;
    
    // Verify school belongs to order
    const school = await dbGet('SELECT id FROM schools WHERE id = ? AND order_id = ?', [schoolId, orderId]);
    if (!school) {
      return res.status(404).json({ error: 'School not found in this order' });
    }

    const result = await dbRun('DELETE FROM schools WHERE id = ?', [schoolId]);
    res.json({ success: true, deleted: result.changes });
  } catch (error) {
    console.error('Error deleting school:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/orders/:orderId/schools/:schoolId/structures - Create structure
router.post('/:orderId/schools/:schoolId/structures', async (req, res) => {
  try {
    const { orderId, schoolId } = req.params;
    const { name, address, kits_count, latitude, longitude } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Structure name is required' });
    }

    // Ensure latitude and longitude are defined (can be null)
    const safeLatitude = latitude !== undefined ? latitude : null;
    const safeLongitude = longitude !== undefined ? longitude : null;

    // Verify school belongs to order
    const school = await dbGet('SELECT id FROM schools WHERE id = ? AND order_id = ?', [schoolId, orderId]);
    if (!school) {
      return res.status(404).json({ error: 'School not found in this order' });
    }

    const { in_same_building } = req.body;
    const safeInSameBuilding = in_same_building === true || in_same_building === 1;
    
    // If in_same_building, use school's address and coordinates
    let finalAddress = address;
    let finalLatitude = safeLatitude;
    let finalLongitude = safeLongitude;
    
    if (safeInSameBuilding) {
      const school = await dbGet('SELECT address, latitude, longitude FROM schools WHERE id = ?', [schoolId]);
      if (school) {
        finalAddress = school.address || null;
        finalLatitude = school.latitude || null;
        finalLongitude = school.longitude || null;
      }
    }
    
    const result = await dbRun(
      'INSERT INTO structures (school_id, name, address, kits_count, latitude, longitude, in_same_building) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [schoolId, name, finalAddress || null, kits_count || 0, finalLatitude || null, finalLongitude || null, safeInSameBuilding ? 1 : 0]
    );

    const structure = await dbGet('SELECT * FROM structures WHERE id = ?', [result.lastID]);
    
    // Recalculate school kits_count
    const structures = await dbAll('SELECT SUM(kits_count) as total FROM structures WHERE school_id = ?', [schoolId]);
    const calculatedKits = structures[0]?.total || 0;
    await dbRun('UPDATE schools SET kits_count = ? WHERE id = ?', [calculatedKits, schoolId]);

    res.json({ success: true, structure });
  } catch (error) {
    console.error('Error creating structure:', error);
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/orders/:orderId/schools/:schoolId/structures/:structureId - Update structure
router.put('/:orderId/schools/:schoolId/structures/:structureId', async (req, res) => {
  try {
    const { orderId, schoolId, structureId } = req.params;
    const { name, address, kits_count, latitude, longitude } = req.body;
    
    // Ensure latitude and longitude are defined (can be null)
    const safeLatitude = latitude !== undefined ? latitude : null;
    const safeLongitude = longitude !== undefined ? longitude : null;

    if (!name) {
      return res.status(400).json({ error: 'Structure name is required' });
    }

    // Verify structure belongs to school which belongs to order
    const structure = await dbGet(
      `SELECT st.id FROM structures st
       JOIN schools s ON st.school_id = s.id
       WHERE st.id = ? AND s.id = ? AND s.order_id = ?`,
      [structureId, schoolId, orderId]
    );
    if (!structure) {
      return res.status(404).json({ error: 'Structure not found' });
    }

    const { in_same_building } = req.body;
    const safeInSameBuilding = in_same_building === true || in_same_building === 1;
    
    // If in_same_building, use school's address and coordinates
    let finalAddress = address;
    let finalLatitude = safeLatitude;
    let finalLongitude = safeLongitude;
    
    if (safeInSameBuilding) {
      const school = await dbGet('SELECT address, latitude, longitude FROM schools WHERE id = ?', [schoolId]);
      if (school) {
        finalAddress = school.address || null;
        finalLatitude = school.latitude || null;
        finalLongitude = school.longitude || null;
      }
    }
    
    await dbRun(
      'UPDATE structures SET name = ?, address = ?, kits_count = ?, latitude = ?, longitude = ?, in_same_building = ?, scheduled_start_time = ?, document_check_duration = ?, distribution_duration = ?, scheduled_end_time = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [name, finalAddress || null, kits_count || 0, finalLatitude || null, finalLongitude || null, safeInSameBuilding ? 1 : 0, req.body.scheduled_start_time || null, req.body.document_check_duration || null, req.body.distribution_duration || null, req.body.scheduled_end_time || null, structureId]
    );

    const updatedStructure = await dbGet('SELECT * FROM structures WHERE id = ?', [structureId]);
    
    // Recalculate school kits_count
    const structures = await dbAll('SELECT SUM(kits_count) as total FROM structures WHERE school_id = ?', [schoolId]);
    const calculatedKits = structures[0]?.total || 0;
    await dbRun('UPDATE schools SET kits_count = ? WHERE id = ?', [calculatedKits, schoolId]);

    res.json({ success: true, structure: updatedStructure });
  } catch (error) {
    console.error('Error updating structure:', error);
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/orders/:orderId/schools/:schoolId/structures/:structureId - Delete structure
router.delete('/:orderId/schools/:schoolId/structures/:structureId', async (req, res) => {
  try {
    const { orderId, schoolId, structureId } = req.params;
    
    // Verify structure belongs to school which belongs to order
    const structure = await dbGet(
      `SELECT st.id FROM structures st
       JOIN schools s ON st.school_id = s.id
       WHERE st.id = ? AND s.id = ? AND s.order_id = ?`,
      [structureId, schoolId, orderId]
    );
    if (!structure) {
      return res.status(404).json({ error: 'Structure not found' });
    }

    const result = await dbRun('DELETE FROM structures WHERE id = ?', [structureId]);
    
    // Recalculate school kits_count
    const structures = await dbAll('SELECT SUM(kits_count) as total FROM structures WHERE school_id = ?', [schoolId]);
    const calculatedKits = structures[0]?.total || 0;
    await dbRun('UPDATE schools SET kits_count = ? WHERE id = ?', [calculatedKits, schoolId]);

    res.json({ success: true, deleted: result.changes });
  } catch (error) {
    console.error('Error deleting structure:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/orders/:orderId/delivery-groups - Create delivery group
router.post('/:orderId/delivery-groups', async (req, res) => {
  try {
    const { orderId } = req.params;
    const { name, description, delivery_date, delivery_hour } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Delivery group name is required' });
    }

    const order = await dbGet('SELECT id FROM orders WHERE id = ?', [orderId]);
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const { start_address, start_latitude, start_longitude, fuel_type, fuel_cost_per_liter, total_km, two_way_km, calculated_distance_km, fuel_consumption, average_speed_kmh } = req.body;
    const result = await dbRun(
      `INSERT INTO delivery_groups (order_id, name, description, delivery_date, delivery_hour, start_address, start_latitude, start_longitude, fuel_type, fuel_cost_per_liter, total_km, two_way_km, calculated_distance_km, fuel_consumption, average_speed_kmh)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [orderId, name, description || null, delivery_date || null, delivery_hour || null, start_address || null, start_latitude || null, start_longitude || null, fuel_type || null, fuel_cost_per_liter || null, total_km || null, two_way_km || null, calculated_distance_km || null, fuel_consumption || null, average_speed_kmh || 50]
    );

    const group = await dbGet('SELECT * FROM delivery_groups WHERE id = ?', [result.lastID]);
    res.json({ success: true, group });
  } catch (error) {
    console.error('Error creating delivery group:', error);
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/orders/:orderId/delivery-groups/:groupId - Update delivery group
router.put('/:orderId/delivery-groups/:groupId', async (req, res) => {
  try {
    const { orderId, groupId } = req.params;
    const { name, description, delivery_date, delivery_hour } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Delivery group name is required' });
    }

    const group = await dbGet('SELECT id FROM delivery_groups WHERE id = ? AND order_id = ?', [groupId, orderId]);
    if (!group) {
      return res.status(404).json({ error: 'Delivery group not found' });
    }

    const { start_address, start_latitude, start_longitude, fuel_type, fuel_cost_per_liter, total_km, two_way_km, calculated_distance_km, fuel_consumption, average_speed_kmh } = req.body;
    await dbRun(
      `UPDATE delivery_groups SET name = ?, description = ?, delivery_date = ?, delivery_hour = ?, 
       start_address = ?, start_latitude = ?, start_longitude = ?, fuel_type = ?, fuel_cost_per_liter = ?, 
       total_km = ?, two_way_km = ?, calculated_distance_km = ?, fuel_consumption = ?, average_speed_kmh = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [name, description || null, delivery_date || null, delivery_hour || null, start_address || null, start_latitude || null, start_longitude || null, fuel_type || null, fuel_cost_per_liter || null, total_km || null, two_way_km || null, calculated_distance_km || null, fuel_consumption || null, average_speed_kmh || 50, groupId]
    );

    const updatedGroup = await dbGet('SELECT * FROM delivery_groups WHERE id = ?', [groupId]);
    res.json({ success: true, group: updatedGroup });
  } catch (error) {
    console.error('Error updating delivery group:', error);
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/orders/:orderId/delivery-groups/:groupId - Delete delivery group
router.delete('/:orderId/delivery-groups/:groupId', async (req, res) => {
  try {
    const { orderId, groupId } = req.params;
    
    const group = await dbGet('SELECT id FROM delivery_groups WHERE id = ? AND order_id = ?', [groupId, orderId]);
    if (!group) {
      return res.status(404).json({ error: 'Delivery group not found' });
    }

    // Unassign schools from this delivery group
    await dbRun('UPDATE schools SET delivery_group_id = NULL WHERE delivery_group_id = ?', [groupId]);
    
    const result = await dbRun('DELETE FROM delivery_groups WHERE id = ?', [groupId]);
    res.json({ success: true, deleted: result.changes });
  } catch (error) {
    console.error('Error deleting delivery group:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/orders/:orderId/export - Export order data
router.post('/:orderId/export', async (req, res) => {
  try {
    const { orderId } = req.params;
    const { format = 'json' } = req.body;

    const order = await dbGet('SELECT * FROM orders WHERE id = ?', [orderId]);
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const schools = await dbAll(
      `SELECT s.*, 
       COALESCE(SUM(st.kits_count), 0) as calculated_kits
       FROM schools s
       LEFT JOIN structures st ON s.id = st.school_id
       WHERE s.order_id = ?
       GROUP BY s.id
       ORDER BY s.name`,
      [orderId]
    );

    for (const school of schools) {
      const structures = await dbAll(
        'SELECT * FROM structures WHERE school_id = ? ORDER BY name',
        [school.id]
      );
      school.structures = structures;
    }

    const data = {
      order,
      schools
    };

    if (format === 'json') {
      res.json({ success: true, data });
    } else {
      // For Excel export, we'll need to install a library like xlsx
      // For now, return JSON
      res.json({ success: true, data });
    }
  } catch (error) {
    console.error('Error exporting order:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/orders/:orderId/auto-group - Auto-group schools by proximity
router.post('/:orderId/auto-group', async (req, res) => {
  try {
    const { orderId } = req.params;
    const { maxDistance = 50, groupNamePrefix = 'Route' } = req.body; // maxDistance in km

    // Get all unassigned schools with coordinates
    const schools = await dbAll(
      `SELECT s.*, 
       COALESCE(SUM(st.kits_count), 0) as calculated_kits
       FROM schools s
       LEFT JOIN structures st ON s.id = st.school_id
       WHERE s.order_id = ? AND s.delivery_group_id IS NULL 
       AND s.latitude IS NOT NULL AND s.longitude IS NOT NULL
       GROUP BY s.id
       HAVING (s.is_standalone = 1 OR COUNT(st.id) = 0) OR 
              EXISTS (SELECT 1 FROM structures st2 WHERE st2.school_id = s.id AND st2.latitude IS NOT NULL AND st2.longitude IS NOT NULL)`,
      [orderId]
    );

    if (schools.length === 0) {
      return res.json({ success: true, message: 'No unassigned schools with coordinates found', groups: [] });
    }

    // Simple clustering algorithm (distance-based)
    const clusters = [];
    const assigned = new Set();

    for (const school of schools) {
      if (assigned.has(school.id)) continue;

      const cluster = [school];
      assigned.add(school.id);

      // Get coordinates for clustering
      let lat, lng;
      if (school.is_standalone) {
        lat = school.latitude;
        lng = school.longitude;
      } else {
        // Use first structure's coordinates
        const structures = await dbAll('SELECT latitude, longitude FROM structures WHERE school_id = ? AND latitude IS NOT NULL LIMIT 1', [school.id]);
        if (structures.length > 0) {
          lat = structures[0].latitude;
          lng = structures[0].longitude;
        } else {
          lat = school.latitude;
          lng = school.longitude;
        }
      }

      // Find nearby schools
      for (const otherSchool of schools) {
        if (assigned.has(otherSchool.id) || otherSchool.id === school.id) continue;

        let otherLat, otherLng;
        if (otherSchool.is_standalone) {
          otherLat = otherSchool.latitude;
          otherLng = otherSchool.longitude;
        } else {
          const structures = await dbAll('SELECT latitude, longitude FROM structures WHERE school_id = ? AND latitude IS NOT NULL LIMIT 1', [otherSchool.id]);
          if (structures.length > 0) {
            otherLat = structures[0].latitude;
            otherLng = structures[0].longitude;
          } else {
            otherLat = otherSchool.latitude;
            otherLng = otherSchool.longitude;
          }
        }

        if (otherLat && otherLng) {
          const distance = calculateDistance(lat, lng, otherLat, otherLng);
          if (distance <= maxDistance) {
            cluster.push(otherSchool);
            assigned.add(otherSchool.id);
          }
        }
      }

      clusters.push(cluster);
    }

    // Create delivery groups and assign schools
    const createdGroups = [];
    for (let i = 0; i < clusters.length; i++) {
      const cluster = clusters[i];
      const groupName = `${groupNamePrefix} ${i + 1}`;
      
      const result = await dbRun(
        `INSERT INTO delivery_groups (order_id, name, description)
         VALUES (?, ?, ?)`,
        [orderId, groupName, `Auto-created group with ${cluster.length} schools`]
      );

      const groupId = result.lastID;
      createdGroups.push({ id: groupId, name: groupName, schools: cluster.length });

      // Assign schools to group
      for (const school of cluster) {
        await dbRun(
          'UPDATE schools SET delivery_group_id = ? WHERE id = ?',
          [groupId, school.id]
        );
      }
    }

    res.json({ success: true, groups: createdGroups, totalGroups: createdGroups.length });
  } catch (error) {
    console.error('Error auto-grouping schools:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/orders/:orderId/optimize-route/:groupId - Optimize route order for a delivery group
router.post('/:orderId/optimize-route/:groupId', async (req, res) => {
  try {
    const { orderId, groupId } = req.params;
    
    // Get group
    const group = await dbGet('SELECT * FROM delivery_groups WHERE id = ? AND order_id = ?', [groupId, orderId]);
    if (!group) {
      return res.status(404).json({ error: 'Delivery group not found' });
    }

    // Get schools in group with their structures
    const schools = await dbAll(
      `SELECT s.*, 
       COALESCE(SUM(st.kits_count), 0) as calculated_kits
       FROM schools s
       LEFT JOIN structures st ON s.id = st.school_id
       WHERE s.delivery_group_id = ?
       GROUP BY s.id`,
      [groupId]
    );

    if (schools.length === 0) {
      return res.json({ success: true, message: 'No schools in group' });
    }

    // Get coordinates for each school/structure
    // Group structures by school to keep them together
    const schoolGroups = [];
    for (const school of schools) {
      const schoolPoints = [];
      if (school.is_standalone) {
        if (school.latitude && school.longitude) {
          schoolPoints.push({ id: school.id, type: 'school', lat: school.latitude, lng: school.longitude, school });
        }
      } else {
        const structures = await dbAll('SELECT id, latitude, longitude FROM structures WHERE school_id = ? AND latitude IS NOT NULL ORDER BY name', [school.id]);
        for (const structure of structures) {
          schoolPoints.push({ id: structure.id, type: 'structure', lat: structure.latitude, lng: structure.longitude, school });
        }
      }
      if (schoolPoints.length > 0) {
        schoolGroups.push({ school, points: schoolPoints });
      }
    }

    if (schoolGroups.length === 0) {
      return res.json({ success: true, message: 'No coordinates found for route optimization' });
    }

    // Optimize order of schools (TSP on school groups)
    const optimizedSchoolOrder = [];
    if (schoolGroups.length > 0) {
      const startLat = group.start_latitude || (schoolGroups[0].points[0]?.lat);
      const startLng = group.start_longitude || (schoolGroups[0].points[0]?.lng);
      
      // Calculate centroid for each school group (average of all structures)
      const schoolCentroids = schoolGroups.map(group => {
        const avgLat = group.points.reduce((sum, p) => sum + p.lat, 0) / group.points.length;
        const avgLng = group.points.reduce((sum, p) => sum + p.lng, 0) / group.points.length;
        return { ...group, centroid: { lat: avgLat, lng: avgLng } };
      });
      
      // Nearest-neighbor TSP on schools
      const remainingSchools = [...schoolCentroids];
      if (remainingSchools.length > 0) {
        // Find closest school to start point
        let currentPoint = { lat: startLat, lng: startLng };
        
        while (remainingSchools.length > 0) {
          let nearestSchool = remainingSchools[0];
          let minDist = calculateDistance(currentPoint.lat, currentPoint.lng, nearestSchool.centroid.lat, nearestSchool.centroid.lng);
          
          for (const schoolGroup of remainingSchools) {
            const dist = calculateDistance(currentPoint.lat, currentPoint.lng, schoolGroup.centroid.lat, schoolGroup.centroid.lng);
            if (dist < minDist) {
              minDist = dist;
              nearestSchool = schoolGroup;
            }
          }
          
          optimizedSchoolOrder.push(nearestSchool);
          currentPoint = nearestSchool.centroid;
          remainingSchools.splice(remainingSchools.indexOf(nearestSchool), 1);
        }
      }
      
      // For each school, optimize order of structures within that school
      const finalRoute = [];
      for (const schoolGroup of optimizedSchoolOrder) {
        if (schoolGroup.points.length === 1) {
          finalRoute.push(schoolGroup.points[0]);
        } else {
          // Optimize structures within this school using nearest-neighbor
          const remainingStructures = [...schoolGroup.points];
          const optimizedStructures = [remainingStructures[0]];
          remainingStructures.splice(0, 1);
          
          while (remainingStructures.length > 0) {
            const lastPoint = optimizedStructures[optimizedStructures.length - 1];
            let nearest = remainingStructures[0];
            let minDist = calculateDistance(lastPoint.lat, lastPoint.lng, nearest.lat, nearest.lng);
            
            for (const structure of remainingStructures) {
              const dist = calculateDistance(lastPoint.lat, lastPoint.lng, structure.lat, structure.lng);
              if (dist < minDist) {
                minDist = dist;
                nearest = structure;
              }
            }
            
            optimizedStructures.push(nearest);
            remainingStructures.splice(remainingStructures.indexOf(nearest), 1);
          }
          
          finalRoute.push(...optimizedStructures);
        }
      }
      
      // Update route_order for schools based on their first appearance in route
      const schoolOrder = new Map();
      for (let i = 0; i < finalRoute.length; i++) {
        const schoolId = finalRoute[i].school.id;
        if (!schoolOrder.has(schoolId)) {
          schoolOrder.set(schoolId, i + 1);
        }
      }

      for (const [schoolId, order] of schoolOrder.entries()) {
        await dbRun('UPDATE schools SET route_order = ? WHERE id = ?', [order, schoolId]);
      }
      
      res.json({ success: true, route: finalRoute.map((p, i) => ({ order: i + 1, school: p.school.name, location: p.type === 'structure' ? `Structure ${p.id}` : 'School', lat: p.lat, lng: p.lng })) });
    }
  } catch (error) {
    console.error('Error optimizing route:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/orders/:orderId/bulk-assign - Assign multiple schools to a delivery group
router.post('/:orderId/bulk-assign', async (req, res) => {
  try {
    const { orderId } = req.params;
    const { schoolIds, groupId } = req.body;

    if (!Array.isArray(schoolIds) || schoolIds.length === 0) {
      return res.status(400).json({ error: 'School IDs array is required' });
    }

    if (groupId === null || groupId === undefined) {
      return res.status(400).json({ error: 'Group ID is required (use null to unassign)' });
    }

    // Verify group exists if provided
    if (groupId !== null) {
      const group = await dbGet('SELECT id FROM delivery_groups WHERE id = ? AND order_id = ?', [groupId, orderId]);
      if (!group) {
        return res.status(404).json({ error: 'Delivery group not found' });
      }
    }

    // Update schools
    const placeholders = schoolIds.map(() => '?').join(',');
    await dbRun(
      `UPDATE schools SET delivery_group_id = ? WHERE id IN (${placeholders}) AND order_id = ?`,
      [groupId, ...schoolIds, orderId]
    );

    res.json({ success: true, assigned: schoolIds.length });
  } catch (error) {
    console.error('Error bulk assigning schools:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/orders/:orderId/statistics - Get delivery statistics
router.get('/:orderId/statistics', async (req, res) => {
  try {
    const { orderId } = req.params;

    const stats = await dbGet(
      `SELECT 
       COUNT(DISTINCT s.id) as total_schools,
       COUNT(DISTINCT st.id) as total_structures,
       COALESCE(SUM(st.kits_count), 0) as total_kits,
       COUNT(DISTINCT s.delivery_group_id) as total_groups,
       COUNT(DISTINCT CASE WHEN s.delivery_group_id IS NULL THEN s.id END) as unassigned_schools
       FROM schools s
       LEFT JOIN structures st ON s.id = st.school_id
       WHERE s.order_id = ?`,
      [orderId]
    );

    // Get group statistics
    const groupStats = await dbAll(
      `SELECT 
       dg.id, dg.name,
       COUNT(DISTINCT s.id) as school_count,
       COALESCE(SUM(st.kits_count), 0) as total_kits
       FROM delivery_groups dg
       LEFT JOIN schools s ON dg.id = s.delivery_group_id
       LEFT JOIN structures st ON s.id = st.school_id
       WHERE dg.order_id = ?
       GROUP BY dg.id, dg.name`,
      [orderId]
    );

    res.json({ success: true, statistics: stats, groupStatistics: groupStats });
  } catch (error) {
    console.error('Error fetching statistics:', error);
    res.status(500).json({ error: error.message });
  }
});

// Helper function to calculate distance between two coordinates (Haversine formula)
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// POST /api/orders/:orderId/route - Get route from Google Maps Directions API (proxied)
router.post('/:orderId/route', async (req, res) => {
  try {
    const { waypoints } = req.body;
    
    if (!waypoints || !Array.isArray(waypoints) || waypoints.length < 2) {
      return res.status(400).json({ error: 'At least 2 waypoints are required' });
    }

    const googleApiKey = process.env.GOOGLE_MAPS_API_KEY;
    if (!googleApiKey) {
      return res.status(500).json({ error: 'Google Maps API key not configured' });
    }

    // Format waypoints for Google Maps API
    const origin = `${waypoints[0][0]},${waypoints[0][1]}`;
    const destination = `${waypoints[waypoints.length - 1][0]},${waypoints[waypoints.length - 1][1]}`;
    
    // Add intermediate waypoints if there are more than 2 points
    let waypointsParam = '';
    if (waypoints.length > 2) {
      const intermediate = waypoints.slice(1, -1).map(point => `${point[0]},${point[1]}`).join('|');
      waypointsParam = `&waypoints=${encodeURIComponent(intermediate)}`;
    }
    
    const googleUrl = `https://maps.googleapis.com/maps/api/directions/json?origin=${origin}&destination=${destination}${waypointsParam}&key=${googleApiKey}&alternatives=false&avoid=ferries&optimize=false`;
    
    const response = await fetch(googleUrl);

    if (!response.ok) {
      throw new Error(`Google Maps API error: ${response.status}`);
    }

    const data = await response.json();

    if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
      return res.status(400).json({ error: `Google Maps API error: ${data.status}`, details: data });
    }

    res.json(data);
  } catch (error) {
    console.error('Error fetching route from Google Maps:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;

