import axios from 'axios'

export const getUsers = async (req, res) => {
  const { query: q } = req;
  try {
    const { data } = await axios.get(
      "https://yts.mx/api/v2/list_movies.json", {
      params: {
        query_term: q.query || q.q || 0,
        page: q.page || q.p || 1,
        genre: q.genre || q.g || "all",
        limit: q.limit || q.l || 20,
        minimum_rating: q.rate || q.r || 0,
        sort_by: q.sort || q.s || "date_added",
        order_by: q.order || q.o || "desc",
        with_rt_ratings: true
      }
    }
    )
    res.send(data)
  } catch (err) {
    res.send({ error: 'Cannot fetch data!', message: err })
  }
}
