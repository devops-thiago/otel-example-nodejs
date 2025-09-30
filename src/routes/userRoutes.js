/**
 * User Routes
 * Defines RESTful API endpoints for user management
 */

const express = require('express');
const userRepository = require('../repositories/userRepository');
const { userSchemas, validate } = require('../validators/userValidator');
const { ApiError } = require('../middleware/errorHandler');
const logger = require('../logger');

const router = express.Router();

/**
 * GET /api/users
 * Get all users with pagination
 */
router.get('/', validate(userSchemas.pagination, 'query'), async (req, res, next) => {
  try {
    const { limit, offset } = req.query;

    const [users, total] = await Promise.all([
      userRepository.findAll(limit, offset),
      userRepository.count(),
    ]);

    res.json({
      data: users,
      pagination: {
        limit,
        offset,
        total,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/users/:id
 * Get user by ID
 */
router.get('/:id', validate(userSchemas.id, 'params'), async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = await userRepository.findById(id);

    if (!user) {
      throw new ApiError(404, `User with ID ${id} not found`);
    }

    res.json({ data: user });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/users
 * Create new user
 */
router.post('/', validate(userSchemas.create, 'body'), async (req, res, next) => {
  try {
    const userData = req.body;

    // Check if email already exists
    const existingUser = await userRepository.findByEmail(userData.email);
    if (existingUser) {
      throw new ApiError(409, `User with email ${userData.email} already exists`);
    }

    const user = await userRepository.create(userData);

    logger.info('User created successfully', { userId: user.id });
    res.status(201).json({ data: user });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/users/:id
 * Update user
 */
router.put(
  '/:id',
  validate(userSchemas.id, 'params'),
  validate(userSchemas.update, 'body'),
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const userData = req.body;

      // Check if user exists
      const existingUser = await userRepository.findById(id);
      if (!existingUser) {
        throw new ApiError(404, `User with ID ${id} not found`);
      }

      // Check if email is being changed and already exists
      if (userData.email && userData.email !== existingUser.email) {
        const emailExists = await userRepository.findByEmail(userData.email);
        if (emailExists) {
          throw new ApiError(409, `User with email ${userData.email} already exists`);
        }
      }

      // Merge with existing data
      const mergedData = {
        name: userData.name ?? existingUser.name,
        email: userData.email ?? existingUser.email,
        age: userData.age ?? existingUser.age,
      };

      const user = await userRepository.update(id, mergedData);

      logger.info('User updated successfully', { userId: id });
      res.json({ data: user });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * DELETE /api/users/:id
 * Delete user
 */
router.delete('/:id', validate(userSchemas.id, 'params'), async (req, res, next) => {
  try {
    const { id } = req.params;

    const deleted = await userRepository.delete(id);

    if (!deleted) {
      throw new ApiError(404, `User with ID ${id} not found`);
    }

    logger.info('User deleted successfully', { userId: id });
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

module.exports = router;
