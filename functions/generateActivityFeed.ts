import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { event, data, old_data } = await req.json();

    // Only process UserBook updates
    if (event.entity_name !== 'UserBook' || !data) {
      return Response.json({ success: true, message: 'Not a UserBook event' });
    }

    // Book finished
    if (event.type === 'update' && data.status === 'Lu' && old_data?.status !== 'Lu') {
      await base44.asServiceRole.entities.ActivityFeed.create({
        activity_type: 'book_finished',
        book_id: data.book_id,
        user_book_id: data.id,
        rating: data.rating || null,
        review_excerpt: data.review ? data.review.substring(0, 150) : null,
        created_by: data.created_by,
        is_visible: true,
        likes: [],
        comments_count: 0
      });
    }

    // Book started
    if (event.type === 'update' && data.status === 'En cours' && old_data?.status !== 'En cours') {
      await base44.asServiceRole.entities.ActivityFeed.create({
        activity_type: 'book_started',
        book_id: data.book_id,
        user_book_id: data.id,
        created_by: data.created_by,
        is_visible: true,
        likes: [],
        comments_count: 0
      });
    }

    // Book rated (when rating is added or changed)
    if (event.type === 'update' && data.rating && data.rating !== old_data?.rating) {
      await base44.asServiceRole.entities.ActivityFeed.create({
        activity_type: 'book_rated',
        book_id: data.book_id,
        user_book_id: data.id,
        rating: data.rating,
        review_excerpt: data.review ? data.review.substring(0, 150) : null,
        created_by: data.created_by,
        is_visible: true,
        likes: [],
        comments_count: 0
      });
    }

    // Check milestones (every time a book is marked as read)
    if (event.type === 'update' && data.status === 'Lu' && old_data?.status !== 'Lu') {
      const userBooks = await base44.asServiceRole.entities.UserBook.filter({ 
        created_by: data.created_by,
        status: 'Lu'
      });
      
      const milestones = [10, 25, 50, 100, 200, 500];
      const count = userBooks.length;
      
      if (milestones.includes(count)) {
        await base44.asServiceRole.entities.ActivityFeed.create({
          activity_type: 'milestone_reached',
          milestone_type: `${count}_books`,
          created_by: data.created_by,
          is_visible: true,
          likes: [],
          comments_count: 0
        });
      }
    }

    return Response.json({ success: true, message: 'Activity generated' });
  } catch (error) {
    console.error('Error generating activity:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});