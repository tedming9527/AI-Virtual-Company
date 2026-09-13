"use strict";

/**
 * @typedef {Object} ViewState
 * @property {string} keyword
 * @property {string[]} rows
 * @property {boolean} loading
 * @property {string|null} error
 */

/**
 * A minimal search state controller. Every search receives an ownership token;
 * only the latest token may commit rows, loading, or error state.
 */
class SearchController {
  /**
   * @param {(keyword: string) => Promise<string[]>} fetchRows
   */
  constructor(fetchRows) {
    if (typeof fetchRows !== "function") {
      throw new TypeError("fetchRows must be a function");
    }
    this.fetchRows = fetchRows;
    /** @type {ViewState} */
    this.state = { keyword: "", rows: [], loading: false, error: null };
    this.latestRequestId = 0;
  }

  /** @returns {ViewState} */
  getState() {
    return { ...this.state, rows: [...this.state.rows] };
  }

  /**
   * @param {string} keyword
   * @returns {Promise<void>}
   */
  async search(keyword) {
    const requestId = ++this.latestRequestId;
    this.state = { ...this.state, keyword, loading: true, error: null };

    try {
      const rows = await this.fetchRows(keyword);
      if (requestId !== this.latestRequestId) return;
      this.state = { keyword, rows: [...rows], loading: false, error: null };
    } catch (error) {
      if (requestId !== this.latestRequestId) return;
      this.state = {
        ...this.state,
        loading: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /** @returns {Promise<void>} */
  retry() {
    return this.search(this.state.keyword);
  }
}

module.exports = { SearchController };
